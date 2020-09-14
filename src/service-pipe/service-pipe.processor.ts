import {Logger} from '@nestjs/common';
import {Job, Queue} from 'bull';
import {
    InjectQueue,
    OnGlobalQueueCompleted,
    Process,
    Processor,
    OnGlobalQueueFailed,
    OnGlobalQueueProgress
} from '@nestjs/bull';
import {
    GENTLEPROCESSOR,
    GOOGLETTSPROCESSOR,
    OPENAIPROCESSOR,
    PIPERPROCESSOR,
    VIDEORENDERPROCESSOR,
    MEDIAPIPEPROCESSOR
} from '../shared/processors.constant';
import {StoreService} from '../shared/services/store/store.service';
import {ServicePipeService} from './service-pipe.service';
import {JobData, SSMLEnhanced} from '../shared/shared.interface';
import {JOB_CANCEL_MESSAGE} from '../shared/shared.constant';

@Processor(PIPERPROCESSOR)
export class ServicePipeProcessor {
    private readonly logger = new Logger(ServicePipeProcessor.name);

    constructor(
        private readonly storeService: StoreService,
        private readonly service: ServicePipeService,
        @InjectQueue(PIPERPROCESSOR) private readonly queue: Queue,
        @InjectQueue(GOOGLETTSPROCESSOR) private readonly googleTtsQueue: Queue
    ) {
    }

    @Process({
        name: 'startPipe',
        concurrency: +process.env.SERVICEPIPE_PROCESS
    })
    async startPipeProcess(job: Job<any>): Promise<any> {
        this.logger.log('Call GCF to prepare SSMLEnhanced data');

        const jobId = job.id.toString();

        //set current step
        await this.storeService.setJobStatus(jobId, {
            step: 'ssmlenhancer',
            status: 'in_progress',
            files: [],
            percentage: 0
        });

        job.progress(10);

        let jobData: JobData = await this.service.readJsonAtGCS(job.data.jsonUrl);

        this.logger.debug('Call GCF to prepare SSMLEnhanced data');
        const preparedData: SSMLEnhanced = await this.service.callSSMLEnhancer(jobData.script);

        //match images names
        let images = [];
        if (preparedData.images && preparedData.images.length) {

            if (!(jobData.uploadedImages && jobData.uploadedImages.length)) {

                this.logger.error('Images are listed in the script, but no images uploaded! Cancelling the job..' + JSON.stringify(preparedData));
                throw new Error('Images are listed in the script, but no images uploaded!');
            }

            // TODO: rename 'imageUrl' field in ssml enhancer function to 'originalName'
            images = preparedData.images.map(image => {

                const uploadedImage = jobData.uploadedImages.find(uploaded => uploaded.originalName == image.imageUrl);
                if (!uploadedImage) {
                    this.logger.error('No image uploaded for listed image ' + JSON.stringify(image))
                    this.logger.error('Uploaded images:' + JSON.stringify(jobData.uploadedImages));
                    throw new Error('No image uploaded for listed image ' + JSON.stringify(image))
                }
                return {...image, ...uploadedImage};
            })
        }

        job.progress(50);

        jobData = {...jobData, ...preparedData, images: images};

        //debug
        // this.logger.debug(preparedData, '========preparedData')
        // this.logger.debug(jobData, '========JobData')
        // throw new Error(JOB_CANCEL_MESSAGE);

        //store updated JSON with new file name
        const jsonUrl = await this.storeService.storeJobData(jobId, jobData);

        //set current step
        await this.storeService.setJobStatus(jobId, {
            step: 'ssmlenhancer',
            status: 'completed',
            files: [],
            percentage: 100
        });

        //set next step
        await this.storeService.setJobStatus(jobId, {
            step: GOOGLETTSPROCESSOR,
            status: 'in_progress',
            files: [],
            percentage: 0
        });

        //start the pipe, provide custom jobId
        this.logger.debug('Start google-tts...');
        await this.googleTtsQueue.add('googleTtsProcess', {jobId, jsonUrl}, {jobId});

        job.progress(100);
    }

    @OnGlobalQueueFailed()
    async handleJobFailed(jobId: string, error: any) {
        if (+process.env.SERVICEPIPE_PROCESS == 0) return;
        // do not handle for cancelled job
        if (error == JOB_CANCEL_MESSAGE) {
            return;
        }
        this.service.handleJobFailed(jobId, error, this.logger);
    }
}

@Processor(GOOGLETTSPROCESSOR)
export class ServicePipeGoogleTTSProcessor {
    private readonly logger = new Logger(ServicePipeGoogleTTSProcessor.name);

    constructor(
        private readonly storeService: StoreService,
        private readonly service: ServicePipeService,
        @InjectQueue(GENTLEPROCESSOR) private readonly gentleQueue: Queue,
        @InjectQueue(GOOGLETTSPROCESSOR) private readonly queue: Queue
    ) {
    }

    @OnGlobalQueueCompleted()
    async handleJobCompleted(jobId: string, jobOutput: string) {
        if (+process.env.SERVICEPIPE_PROCESS == 0) return;
        const result = JSON.parse(jobOutput);
        const job = await this.queue.getJob(jobId);

        const jobStatus = await this.storeService.getJobStatus(jobId);
        jobStatus.step = GENTLEPROCESSOR; //set next step
        jobStatus.files.push({ttsWavFile: result.audioUrl});
        jobStatus.percentage = 0;

        const jobData: JobData = await this.service.readJsonAtGCS(job.data.jsonUrl);
        jobData.ttsWavFileUrl = result.audioUrl;

        await this.storeService.setJobStatus(jobId, jobStatus);
        const jsonUrl = await this.storeService.storeJobData(jobId, jobData);

        await this.gentleQueue.add('Gentle', {jsonUrl}, {jobId});

        this.logger.debug(`GOOGLETTSPROCESSOR ${jobId} completed`);
        this.logger.debug(result);
    }

    @OnGlobalQueueFailed()
    async handleJobFailed(jobId: string, error: any) {
        if (+process.env.SERVICEPIPE_PROCESS == 0) return;
        // do not handle for cancelled job
        if (error == JOB_CANCEL_MESSAGE) {
            return;
        }
        this.service.handleJobFailed(jobId, error, this.logger);
    }

    @OnGlobalQueueProgress()
    async handleJobProgress(jobId: string, progress: number) {
        if (+process.env.SERVICEPIPE_PROCESS == 0) return;
        this.service.handleJobProgress(jobId, progress, this.logger);
    }
}

@Processor(GENTLEPROCESSOR)
export class ServicePipeGentleProcessor {
    private readonly logger = new Logger(ServicePipeGentleProcessor.name);

    constructor(
        private readonly storeService: StoreService,
        private readonly service: ServicePipeService,
        @InjectQueue(OPENAIPROCESSOR) private readonly openAiQueue: Queue,
        @InjectQueue(GENTLEPROCESSOR) private readonly queue: Queue
    ) {
    }

    @OnGlobalQueueCompleted()
    async handleJobCompleted(jobId: string, jobOutput: string) {
        if (+process.env.SERVICEPIPE_PROCESS == 0) return;
        const job = await this.queue.getJob(jobId);
        const result = JSON.parse(jobOutput);

        const jobStatus = await this.storeService.getJobStatus(jobId);
        jobStatus.step = OPENAIPROCESSOR; //set next step
        jobStatus.percentage = 0;

        jobStatus.files.push({subtitleCSVUrl: result.subtitleCSVUrl});
        jobStatus.files.push({subtitleSRTUrl: result.subtitleSRTUrl});

        await this.storeService.setJobStatus(jobId, jobStatus);

        let jobData: JobData = await this.service.readJsonAtGCS(job.data.jsonUrl);
        jobData = {...jobData, ...result};

        const jsonUrl = await this.storeService.storeJobData(jobId, jobData);

        await this.openAiQueue.add('getVideosByContext', {jsonUrl}, {jobId});

        this.logger.debug(`GENTLEPROCESSOR ${jobId} completed`);
        this.logger.debug(result);
    }

    @OnGlobalQueueFailed()
    async handleJobFailed(jobId: string, error: any) {
        if (+process.env.SERVICEPIPE_PROCESS == 0) return;
        // do not handle for cancelled job
        if (error == JOB_CANCEL_MESSAGE) {
            return;
        }
        this.service.handleJobFailed(jobId, error, this.logger);
    }

    @OnGlobalQueueProgress()
    async handleJobProgress(jobId: string, progress: number) {
        if (+process.env.SERVICEPIPE_PROCESS == 0) return;
        this.service.handleJobProgress(jobId, progress, this.logger);
    }
}

@Processor(OPENAIPROCESSOR)
export class ServicePipeOpenAIProcessor {
    private readonly logger = new Logger(ServicePipeOpenAIProcessor.name);

    constructor(
        private readonly storeService: StoreService,
        private readonly service: ServicePipeService,
        @InjectQueue(MEDIAPIPEPROCESSOR) private readonly mediaPipeQueue: Queue,
        @InjectQueue(OPENAIPROCESSOR) private readonly queue: Queue
    ) {
    }

    @OnGlobalQueueCompleted()
    async handleJobCompleted(jobId: string, jobOutput: string) {
        if (+process.env.SERVICEPIPE_PROCESS == 0) return;
        const job = await this.queue.getJob(jobId);
        const result = JSON.parse(jobOutput);

        const jobStatus = await this.storeService.getJobStatus(jobId);
        jobStatus.step = MEDIAPIPEPROCESSOR; //set next step
        jobStatus.percentage = 0;
        await this.storeService.setJobStatus(jobId, jobStatus);

        let jobData: JobData = await this.service.readJsonAtGCS(job.data.jsonUrl);
        jobData = {...jobData, ...result};

        const jsonUrl = await this.storeService.storeJobData(jobId, jobData);

        await this.mediaPipeQueue.add('mediaPipeProcess', {jsonUrl}, {jobId});

        this.logger.debug(`OPENAIPROCESSOR ${jobId} completed`);
        this.logger.debug(result);
    }

    @OnGlobalQueueFailed()
    async handleJobFailed(jobId: string, error: any) {
        if (+process.env.SERVICEPIPE_PROCESS == 0) return;
        // do not handle for cancelled job
        if (error == JOB_CANCEL_MESSAGE) {
            return;
        }
        this.service.handleJobFailed(jobId, error, this.logger);
    }

    @OnGlobalQueueProgress()
    async handleJobProgress(jobId: string, progress: number) {
        if (+process.env.SERVICEPIPE_PROCESS == 0) return;
        this.service.handleJobProgress(jobId, progress, this.logger);
    }
}

@Processor(MEDIAPIPEPROCESSOR)
export class ServicePipeMediaPipeProcessor {
    private readonly logger = new Logger(ServicePipeMediaPipeProcessor.name);

    constructor(
        private readonly storeService: StoreService,
        private readonly service: ServicePipeService,
        @InjectQueue(VIDEORENDERPROCESSOR) private readonly videoRendererQueue: Queue,
        @InjectQueue(MEDIAPIPEPROCESSOR) private readonly queue: Queue
    ) {
    }

    @OnGlobalQueueCompleted()
    async handleJobCompleted(jobId: string, jobOutput: string) {
        if (+process.env.SERVICEPIPE_PROCESS == 0) return;
        const job = await this.queue.getJob(jobId);
        const result = JSON.parse(jobOutput);

        const jobStatus = await this.storeService.getJobStatus(jobId);
        jobStatus.step = VIDEORENDERPROCESSOR; //set next step
        jobStatus.percentage = 0;

        //TODO: awaiting when mediapipe worker is ready
        //TODO: add each file in the result
        // jobStatus.files.push({'subtitleCSVUrl': result.subtitleCSVUrl});
        // jobStatus.files.push({'subtitleSRTUrl': result.subtitleSRTUrl});

        await this.storeService.setJobStatus(jobId, jobStatus);

        let jobData: JobData = await this.service.readJsonAtGCS(job.data.jsonUrl);
        jobData = {...jobData, ...result};

        const jsonUrl = await this.storeService.storeJobData(jobId, jobData);

        await this.videoRendererQueue.add('render', {jsonUrl}, {jobId});

        this.logger.debug(`MEDIAPIPEPROCESSOR ${jobId} completed`);
        this.logger.debug(result);
    }

    @OnGlobalQueueFailed()
    async handleJobFailed(jobId: string, error: any) {
        if (+process.env.SERVICEPIPE_PROCESS == 0) return;
        // do not handle for cancelled job
        if (error == JOB_CANCEL_MESSAGE) {
            return;
        }
        this.service.handleJobFailed(jobId, error, this.logger);
    }

    @OnGlobalQueueProgress()
    async handleJobProgress(jobId: string, progress: number) {
        if (+process.env.SERVICEPIPE_PROCESS == 0) return;
        this.service.handleJobProgress(jobId, progress, this.logger);
    }
}

@Processor(VIDEORENDERPROCESSOR)
export class ServicePipeVideoRendererProcessor {
    private readonly logger = new Logger(ServicePipeVideoRendererProcessor.name);

    constructor(
        private readonly storeService: StoreService,
        private readonly service: ServicePipeService,
        @InjectQueue(OPENAIPROCESSOR) private readonly openAiQueue: Queue,
        @InjectQueue(VIDEORENDERPROCESSOR) private readonly queue: Queue
    ) {
    }

    @OnGlobalQueueCompleted()
    async handleJobCompleted(jobId: string, jobOutput: string) {
        if (+process.env.SERVICEPIPE_PROCESS == 0) return;
        const job = await this.queue.getJob(jobId);

        const jobStatus = await this.storeService.getJobStatus(jobId);
        jobStatus.step = 'completed'; //set next step
        jobStatus.status = 'completed';
        jobStatus.percentage = 100;
        const output = JSON.parse(jobOutput);
        for (const profile in output) {
            jobStatus.files.push({[profile]: output[profile]});
        }
        await this.storeService.setJobStatus(jobId, jobStatus);

        this.logger.debug(`VIDEORENDERPROCESSOR ${jobId} completed`);
        this.logger.debug(jobOutput);
    }

    @OnGlobalQueueFailed()
    async handleJobFailed(jobId: string, error: any) {
        if (+process.env.SERVICEPIPE_PROCESS == 0) return;
        // do not handle for cancelled job
        if (error == JOB_CANCEL_MESSAGE) {
            return;
        }
        this.service.handleJobFailed(jobId, error, this.logger);
    }

    @OnGlobalQueueProgress()
    async handleJobProgress(jobId: string, progress: number) {
        if (+process.env.SERVICEPIPE_PROCESS == 0) return;
        this.service.handleJobProgress(jobId, progress, this.logger);
    }
}
