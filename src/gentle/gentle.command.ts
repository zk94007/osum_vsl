import {Command} from 'nestjs-command';
import {Injectable, Logger} from '@nestjs/common';
import {Queue} from 'bull';
import {InjectQueue} from '@nestjs/bull';
import * as uuid from 'uuid';
import {GentleService} from "./gentle.service";
import {GentleResponse, PollyWord, Subtitle} from "../shared/shared.interface";
import {getVideoAudioDuration} from "../shared/helpers/video.helper";
import {SUBTITLE_CAP, SUBTITLE_TIMESHIFT_MS} from "./gentle.constant";
import * as fs from "fs";



@Injectable()
export class GentleCommand {
  private readonly logger = new Logger(GentleCommand.name);

  constructor(
      private readonly gentleService: GentleService,
      @InjectQueue('gentle') private readonly gentleQueue: Queue
  ) {}

  @Command({command: 'test:gentle', describe: 'test gentle job', autoExit: true})
  async test() {

    // await this.gentleQueue.add(
    //   'Gentle',
    //   {
    //     jsonUrl: '5858ebc4-643b-4aa9-b0f4-1cfeaac117f7/adc54661-6651-4a8a-8518-69806d402544.json'
    //   },
    //   {
    //     jobId: uuid.v4()
    //   }
    // );
    //

    const jobData = {
      voiceGender: 'male',
      useVidux: '1',
      videosPercent: '',
      script: "The <image: : product: : 2020-07-03_22-08.png>Lorem ipsum</image> little princess went round the table with quick, short, swaying steps, her workbag on her arm, and gaily",
      uploadedImages: [
        {
          originalName: '2020-07-03_22-08.png',
          rawContent: '9dcfc6f0-2fa0-4ed7-9415-b50fcc81590b/c115ff99-63e4-467b-b750-5d576fcf1d51.png'
        }
      ],
      ssml: '<speak> The Lorem ipsum little princess went round the table with quick, short, swaying steps, her workbag on her arm, and gaily </speak>',
      enhancedText: 'The Lorem ipsum <adj>little</adj> princess <vrb>went</vrb> round the table with quick, short, <vrb>swaying</vrb> steps, her workbag on her arm, and gaily',
      plainText: 'The Lorem ipsum little princess went round the table with quick, short, swaying steps, her workbag on her arm, and gaily',
      disclaimers: [],
      citations: [],
      images: [
        {
          text: 'Lorem ipsum',
          type: 'product',
          imageUrl: '2020-07-03_22-08.png',
          originalName: '2020-07-03_22-08.png',
          rawContent: '9dcfc6f0-2fa0-4ed7-9415-b50fcc81590b/c115ff99-63e4-467b-b750-5d576fcf1d51.png'
        }
      ],
      ttsWavFileUrl: '9dcfc6f0-2fa0-4ed7-9415-b50fcc81590b/b3a72253-d3ce-4e04-8e28-7529bee4f732.wav'
    }

    console.log(jobData)



  }
}
