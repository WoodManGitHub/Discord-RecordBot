const Stream = require('stream');
const Prism = require('prism-media');
const moment = require('moment-timezone')
const AudioUtils = require('./../audio.js');
const LicsonMixer = require('../licsonMixer/mixer.js');

function startRecord(connection, channelConfig) {
    const channelRecvMixer = global.discord.channelRecvMixers[channelConfig.channelID] = new LicsonMixer(16, 2, 48000);
    const outputMP3Stream = global.discord.outputMP3Streams[channelConfig.channelID] = AudioUtils.generatePCMtoMP3Stream(channelRecvMixer);

    const userPCMStreams = global.discord.userPCMStreams[channelConfig.channelID] = {};
    const userMixers = global.discord.userMixers[channelConfig.channelID] = {};
    const userMP3Buffers = global.discord.userMP3Buffers[channelConfig.channelID] = {};

    console.log("[Discord Record] Start record in voice channel => " + channelConfig.channelID + " .");

    // PlayMixer(PCM) => mixer(PCM
    channelRecvMixer.addSource(global.discord.audio.playMixer[channelConfig.channelID]);

    connection.on("speaking", (user, speaking) => {
        if (speaking) {
            const recvStream = connection.receiver.createStream(user, { mode: "pcm" });
            recvStream.on("data", (chunk) => {
                if (user.id == undefined || channelConfig.record.ignoreUsers.includes(user.id)) {
                    return;
                }

                if (userPCMStreams[user.id] == undefined) {
                    const userPCMStream = userPCMStreams[user.id] = new Stream.PassThrough();
                    const userMixer = userMixers[user.id] = new LicsonMixer(16, 2, 48000);
                    const userMP3Buffer = userMP3Buffers[user.id] = [];

                    console.log("[Discord Record] Add user " + user.id + " to record mixer " + channelConfig.channelID + " .");

                    // userPCMStream(PCM) => userMixer(PCM)
                    userMixer.addSource(userPCMStream)
                    // userPCMStream(PCM) => channelRecvMixer(PCM)
                    channelRecvMixer.addSource(userPCMStream)

                    // userMixer(PCM) => MP3Buffer(MP3)
                    AudioUtils.generatePCMtoMP3Stream(userMixer).on("data", mp3Data => {
                        userMP3Buffer.push(mp3Data);
                        if (userMP3Buffer.length > 4096) {
                            userMP3Buffer.shift(userMP3Buffer.length - 4096);
                        }
                    });
                }
                userPCMStreams[user.id].push(chunk);
            });

            recvStream.on('end', () => {
                connection.receiver.packets._stoppedSpeaking(user.id);
            });
        }
    });

    if (channelConfig.record.sendTo.type == 'telegram' && channelConfig.record.sendTo.chatID) {
        var mp3File = [];
        var mp3Start = moment().tz('Asia/Taipei').format('YYYY-MM-DD hh:mm:ss');
        outputMP3Stream.on('data', function (data) {
            mp3File.push(data);
        });
        setInterval(() => {
            var mp3End = moment().tz('Asia/Taipei').format('YYYY-MM-DD hh:mm:ss');
            const caption = `${mp3Start} -> ${mp3End} \n${moment().tz("Asia/Taipei").format("#YYYYMMDD #YYYY")}`;
            const fileName = mp3Start + ' to ' + mp3End + '.mp3';

            mp3Start = moment().tz('Asia/Taipei').format('YYYY-MM-DD hh:mm:ss');

            const fileData = Buffer.concat(mp3File);

            mp3File = [];
            global.telegram.sendAudio(channelConfig.record.sendTo.chatID, fileData, fileName, caption);
        }, 20 * 1000);
    }
}

module.exports = {
    startRecord
}
