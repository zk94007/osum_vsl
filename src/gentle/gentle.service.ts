import {Injectable, Logger, HttpService} from '@nestjs/common';
import * as FormData from 'form-data';
import * as fs from 'fs';
import * as moment from 'moment';
import {AxiosResponse} from 'axios';
import {
    Subtitle,
    OpenAIItem,
    Disclaimer,
    Citation,
    Image,
    GentleResponse,
    GentleWord,
    PollyWord,
} from '../shared/shared.interface';
import * as stringify from 'csv-stringify';

@Injectable()
export class GentleService {
    private readonly logger = new Logger(GentleService.name);

    constructor(private httpService: HttpService) {
    }

    toOpenAIData(data: Array<Subtitle>): Array<Subtitle> {
        const openAIData: Array<Subtitle> = [];

        for (let i = 0; i < data.length; i++) {

            const currentSubtitle: Subtitle = data[i];

            const openAIItem: OpenAIItem = {current: data[i].text};
            if (i > 0) {
                openAIItem.before = data[i - 1].text;
            }
            if (i < data.length - 1) {
                openAIItem.after = data[i + 1].text;
            }

            currentSubtitle.textContext = openAIItem;
            openAIData.push(currentSubtitle);
        }

        return openAIData;
    }

    async toCSV(data: Array<any>): Promise<string> {
        return new Promise((resolve, reject) => {
            stringify(data, {header: true, quoted: true, cast: {boolean: b => (b ? '1' : '0')}}, (err, output) => {
                if (err) reject(err);
                resolve(output);
            });
        });
    }

    buildStringSubtitles(subtitlesArr: Array<Subtitle>): string {
        const formatDuration = (time: number): string => {
            const formatInt = (int: number): string => {
                if (int < 10) {
                    return `0${int}`;
                }
                return `${int}`;
            };
            const hours: string = (() => formatInt(moment.duration(time).hours()) || '00')();
            const minutes: string = (() => formatInt(moment.duration(time).minutes()) || '00')();
            const seconds: string = (() => formatInt(moment.duration(time).seconds()) || '00')();
            const milliseconds: string = (() => {
                const ms =
                    moment
                        .duration(time)
                        .milliseconds()
                        .toFixed() || '000';
                if (+ms < 10) return `00${ms}`;
                if (+ms < 100) return `0${ms}`;
                return ms;
            })();
            return `${hours}:${minutes}:${seconds},${milliseconds}`;
        };

        let str = '';
        for (let i = 0; i < subtitlesArr.length; i++) {
            const {text, startTime, endTime} = subtitlesArr[i];
            str += `${i + 1}\n`;
            str += `${formatDuration(startTime)} --> ${formatDuration(endTime)}\n`;
            str += `${text}\n\n`;
        }
        return str;
    }

    /**
     *
     * @param gentleArr gentle data
     * @param audioDurationSeconds - audio file duration (in seconds)
     */
    gentleToJson(gentleArr: Array<GentleWord>, audioDurationSeconds): Array<PollyWord> {

        const audioDurationMs = audioDurationSeconds * 1000;

        const pollyArr: Array<PollyWord> = [];
        for (let i = 0; i < gentleArr.length; i++) {
            const gentleObj: GentleWord = gentleArr[i];
            const pollyObj: PollyWord = {word: gentleObj.word};
            // NOTE:
            // "not-found-in-audio" case happens when Gentle can't recognize word from audio,
            // So we need to catch it and calculate this unrecognized word timings.
            // Even if few words in a row hasn't recognized, we need to calculate timings for each of them.
            if (gentleObj.case !== 'not-found-in-audio') {
                pollyObj.time = (gentleObj.start * 1000).toFixed();
                pollyObj.endTime = (gentleObj.end * 1000).toFixed();
            } else {

                /** if Gentle was unable to recognize the word and get word time -
                 *  //calculate a time shift for each unrecognized word in the row,
                 *  with the timeshit = 0.001 sec - calculate average time start for each unrecognized word
                 */

                let prevRecognizedWordIdx = i;
                let nextRecognizedWordIdx = i;

                //  TODO: refactor this - optimize!!

                //find prev recognized word. set '0' if there is no prev recognized word
                let prevRecognizedTime = 0;
                while (prevRecognizedWordIdx >= 0 && gentleArr[prevRecognizedWordIdx].case === 'not-found-in-audio') prevRecognizedWordIdx -= 1;
                if (prevRecognizedWordIdx >= 0) {
                    prevRecognizedTime = gentleArr[prevRecognizedWordIdx].end;
                }

                //find next recognized word. set ending time of the audio if there is no next recognized word
                let nextRecognizedTime = audioDurationMs;
                while (nextRecognizedWordIdx < gentleArr.length && gentleArr[nextRecognizedWordIdx].case === 'not-found-in-audio') nextRecognizedWordIdx += 1;
                if (nextRecognizedWordIdx < gentleArr.length) {
                    nextRecognizedTime = gentleArr[nextRecognizedWordIdx].start;
                }

                const distance = nextRecognizedWordIdx - prevRecognizedWordIdx;
                // const shift = (nextRecognizedTime - prevRecognizedTime) / distance; //time shift for each unrecognized word
                const shift = 0.001;

                pollyObj.time = ((gentleArr[prevRecognizedWordIdx].end + (i - prevRecognizedWordIdx) * shift) * 1000).toFixed();

                // console.log("Word: %s, time: %d, shift: %d", gentleObj.word, pollyObj.time, shift)

                pollyObj.endTime = pollyObj.time;
                pollyObj.fixed = true;
            }
            pollyArr.push(pollyObj);
        }
        return pollyArr;
    }

    separateWords(string: string): Array<string> {
        if (!string) return [];
        const match = string.match(/"(?:\\"|[^"])+"|[^(\s|\-)]+/g);
        if (!match) return [];
        return match.map(word => word.replace(/^\"|\"$/g, ''));
    }

    async buildWordsAndSubtitlesByRows(
        initialText: string,
        _pollyWordsArr: Array<PollyWord>,
        mergedDuration: number,
        cap = 42,
        timeShiftMs = 0
    ) {
        const initWordsArr: Array<string> = this.separateWords(initialText);
        const pollyWordsArr: Array<PollyWord> = _pollyWordsArr.filter(w => !/(<([^>]+)>)/.test(w.word));

        // NOTE:
        // This debugger is for manual check for missmatching between array of words from initial text
        // and array of words from Gentle.

        // const wordsDebuggerArr = [];
        // for (let i = 0; i < initWordsArr.length; i++) {
        //   wordsDebuggerArr.push({
        //     init: initWordsArr[i],
        //     polly: pollyWordsArr[i].word,
        //     time: pollyWordsArr[i].time,
        //     timeShiftMs,
        //   });
        // }
        // await writeFile("wordsDebuggerArr.json", JSON.stringify(wordsDebuggerArr));

        if (initWordsArr.length !== pollyWordsArr.length) {
            console.error({
                initWordsArr: initWordsArr.length,
                pollyWordsArr: pollyWordsArr.length
            });
            throw new Error('[buildWordsAndSubtitlesByRows] word arrays length mismatch');
        }
        const linesArr: Array<string> = [];
        const sentencesArr: Array<Subtitle> = [];
        const subtitlesArr: Array<Subtitle> = [];
        let currentLine = '';
        let currentSentence = '';
        let startTime = +pollyWordsArr[0].time;
        let startTimeSentence = +pollyWordsArr[0].time;

        // Processing array of words except last element (it will be processed with different logic separately)
        for (let i = 0; i < initWordsArr.length - 1; i += 1) {
            const initWord = initWordsArr[i];
            let {time} = pollyWordsArr[i];
            time = +time;

            // Building array of rows (with length cap)
            if (`${currentLine} ${initWord}`.length <= cap) {
                currentLine = `${currentLine} ${initWord}`;
            } else {
                linesArr.push(currentLine.trim());

                const subtitleStartTime = startTime !== pollyWordsArr[0].time ? startTime + timeShiftMs : startTime;
                let subtitleEndTime = time + timeShiftMs;

                /**
                 * If gentle did not recognize some words - duration for some scenes can be calculated for few ms
                 * then - set duration for this scene to 500ms
                 */
                if (subtitleEndTime - subtitleStartTime < 500) {
                    subtitleEndTime += 500;
                }

                subtitlesArr.push({
                    text: currentLine.trim(),
                    startTime: subtitleStartTime,
                    endTime: subtitleEndTime
                });

                startTime = subtitleEndTime;
                currentLine = initWord;
            }

            // Building array of sentences (with length cap)
            if (!/(\!)|(\?)|(\.)|(\.\.\.)/.test(initWord)) {
                currentSentence = `${currentSentence} ${initWord}`;
            } else {
                sentencesArr.push({
                    text: `${currentSentence} ${initWord}`.trim(),
                    startTime:
                        +startTimeSentence !== pollyWordsArr[0].time ? +startTimeSentence + timeShiftMs : +startTimeSentence,
                    endTime: +time + timeShiftMs
                });
                startTimeSentence = time;
                currentSentence = '';
            }
        }

        // Last word is processing separately
        const lastInitWord = initWordsArr[initWordsArr.length - 1];
        linesArr.push(`${currentLine} ${lastInitWord}`.trim());
        subtitlesArr.push({
            text: `${currentLine} ${lastInitWord}`.trim(),
            startTime: +startTime + timeShiftMs,
            endTime: +mergedDuration * 1000 + timeShiftMs
        });
        sentencesArr.push({
            text: `${currentSentence} ${lastInitWord}`.trim(),
            startTime: +startTime + timeShiftMs,
            endTime: +mergedDuration * 1000 + timeShiftMs
        });
        return {
            subtitlesArr, // rows with timings
            linesArr, // just rows
            sentencesArr // sentences with timings
        };
    }

    // this function is for building JSON with timings by words
    // based on JSON with timings by rows
    buildSrtByWords(arr: Array<Subtitle>): Array<Subtitle> {
        const _process = ({startTime, endTime, text, prevDuration}) => {
            const timeDiff: number = +endTime - +startTime;
            const words: Array<string> = this.separateWords(text);
            const wordDuration: number = timeDiff / words.length;
            const srtByWordsJson: Array<Subtitle> = [];
            const duration = moment.duration(prevDuration).add(1);
            for (let i = 0; i < words.length; i += 1) {
                const w = words[i];
                srtByWordsJson.push({
                    startTime: +duration.asMilliseconds().toFixed(),
                    endTime: +duration
                        .add(wordDuration)
                        .asMilliseconds()
                        .toFixed(),
                    text: w
                });
            }
            return {srtByWordsJson};
        };

        const srtJsonByWords: Array<Subtitle> = [];
        for (const el of arr) {
            const {srtByWordsJson: words} = _process({
                ...el,
                prevDuration: +el.startTime
            });
            // console.log({ el });
            srtJsonByWords.push(...words);
        }
        srtJsonByWords[srtJsonByWords.length - 1].endTime = srtJsonByWords[srtJsonByWords.length - 1].endTime - 1; // coz we don't need to increment last word's endTime
        return srtJsonByWords;
    }

    async request(audioFilePath: string, text: string): Promise<GentleResponse> {
        const data: FormData = new FormData();

        data.append('audio', fs.createReadStream(audioFilePath));
        data.append('transcript', text);

        const result:AxiosResponse<GentleResponse> = await this.httpService
            .post(process.env.GENTLE_API_URL, data, {
                headers: {...data.getHeaders()},
                maxContentLength: Infinity,
                params: {
                    async: false
                }
            })
            .toPromise();

        return result.data;
    }

    buildDisclaimerCitationImage(
        plaintext: string,
        pollyWords: Array<PollyWord>,
        disclaimers: Array<Disclaimer>,
        citations: Array<Citation>,
        images: Array<Image>
    ) {
        const words: Array<string> = this.separateWords(plaintext);
        let startIndex = 0;
        const pollyInIndexOf: any = {};
        const pollyInLastIndexOf: any = {};

        // put polly words to positions of plaintext
        for (const polly of pollyWords) {
            const position = plaintext.indexOf(polly.word, startIndex);
            if (position == -1) throw "Polly words don't match";
            pollyInIndexOf[position] = polly; // put polly words at the first index of the word
            pollyInLastIndexOf[position + polly.word.length] = polly; // put polly words at the last index of the word
            startIndex = position + polly.word.length;
        }

        // get disclaimers
        const resultDisclaimers: Array<Subtitle> = [];
        for (const disclaimer of disclaimers) {
            const regexp = new RegExp(`\\b${disclaimer.text}\\b`, 'gim');
            let match;
            // iterate all the occurrences of disclaimers
            while ((match = regexp.exec(plaintext))) {
                if (!pollyInIndexOf[match.index]) throw "disclaimers don't match, first word";
                if (!pollyInLastIndexOf[regexp.lastIndex]) throw "disclaimers don't match, last word";
                const startPolly: PollyWord = pollyInIndexOf[match.index]; // get first polly word of the disclaimer
                const endPolly: PollyWord = pollyInLastIndexOf[regexp.lastIndex]; // get last polly word of the disclaimer
                resultDisclaimers.push({
                    text: disclaimer.disclaimer,
                    startTime: +startPolly.time,
                    endTime: +endPolly.endTime
                });
            }
        }

        // get citations
        const resultCitations: Array<Subtitle> = [];
        for (const citation of citations) {
            const regexp = new RegExp(`\\b${citation.text}\\b`, 'gim');
            let match;
            // iterate all the occurrences of citations
            while ((match = regexp.exec(plaintext))) {
                if (!pollyInIndexOf[match.index]) throw "citations don't match, first word";
                if (!pollyInLastIndexOf[regexp.lastIndex]) throw "citations don't match, last word";
                const startPolly: PollyWord = pollyInIndexOf[match.index]; // get first polly word of the citation
                const endPolly: PollyWord = pollyInLastIndexOf[regexp.lastIndex]; // get last polly word of the citation
                resultCitations.push({
                    text: citation.citation,
                    startTime: +startPolly.time,
                    endTime: +endPolly.endTime
                });
            }
        }

        // get images
        const resultImages: Array<Image> = [];
        for (const image of images) {
            const regexp = new RegExp(`\\b${image.text}\\b`, 'gim');
            let match;
            // iterate all the occurrences of texts of images
            while ((match = regexp.exec(plaintext))) {
                if (!pollyInIndexOf[match.index]) throw "images don't match, first word";
                if (!pollyInLastIndexOf[regexp.lastIndex]) throw "images don't match, last word";
                const startPolly: PollyWord = pollyInIndexOf[match.index]; // get first polly word of the image text
                const endPolly: PollyWord = pollyInLastIndexOf[regexp.lastIndex]; // get first polly word of the image text
                resultImages.push({
                    ...image,
                    startTime: +startPolly.time,
                    endTime: +endPolly.endTime
                });
            }
        }

        return {
            disclaimers: resultDisclaimers,
            citations: resultCitations,
            images: resultImages
        };
    }
}
