const {exec} = require('child_process');
const fs = require("fs");
const ffmpeg = require('fluent-ffmpeg');

// const cmd = `ffmpeg -i video-test.mp4 \\
//   -map 0:v:0 -map 0:a:0 -map 0:v:0 -map 0:a:0 -map 0:v:0 -map 0:a:0 \\
//   -c:v libx264 -crf 22 -c:a aac -ar 44100 \\
//   -filter:v:0 scale=w=480:h=360  -maxrate:v:0 600k -b:a:0 500k \\
//   -filter:v:1 scale=w=640:h=480  -maxrate:v:1 1500k -b:a:1 1000k \\
//   -filter:v:2 scale=w=1280:h=720 -maxrate:v:2 3000k -b:a:2 2000k \\
//   -var_stream_map "v:0,a:0,name:360p v:1,a:1,name:480p v:2,a:2,name:720p" \\
//   -preset fast -hls_list_size 10 -threads 0 -f hls \\
//   -hls_time 3 -hls_flags independent_segments \\
//   -master_pl_name "livestream.m3u8" \\
//   -y "livestream-%v.m3u8"`
//
// exec(cmd, (err, stdout, stderr) => {
//     if (err) {
//         console.log(`error: ${err}`)
//         // node couldn't execute the command
//         return;
//     }
//     // the *entire* stdout and stderr (buffered)
//     console.log(`stdout: ${stdout}`);
//     console.log(`stderr: ${stderr}`);
// });

const folderBase = 'hls'

const convertM3u8 = async (quality, direct_url, folderName) => {
    return new Promise((resolve, reject) => {
        ffmpeg(direct_url)
            .size(quality.size)
            .outputOptions([
                `-maxrate:v ${quality.videoRate}`,
                `-b:a ${quality.audioRate}`,
                '-g 60',
                '-hls_time 5',
                '-hls_list_size 0',
                '-hls_segment_size 500000'
            ])
            .output(`./${folderBase}/${folderName}/${folderName}-${quality.version}p.m3u8`)
            .on('progress', function (progress) {
                console.log('Processing: ' + progress.percent + '% done')
            })
            .on('end', function (err, stdout, stderr) {
                resolve()
                console.log('Finished processing!' /*, err, stdout, stderr*/)
            })
            .run()
    })
}

const readResolution = (direct_url) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(direct_url, function (e, data) {
            if (e) {
                console.log('Error:', e);
                resolve(0)
            } else {
                console.log('Resolution:', data.streams[0].width + 'x' + data.streams[0].height);
                resolve(data.streams[0].height)
            }
        })
    })
}

const genFolderName = () => {
    return Math.random().toString(36).substring(2)
}

const genFolder = async () => {
    const folderName = genFolderName()
    fs.mkdirSync(`./${folderBase}/${folderName}`)
    return folderName
}

const deleteFolder = async (folderName) => {
    fs.rmdirSync(`./${folderBase}/${folderName}`, {recursive: true, force: true})
    console.log(`delete folder success:  ${folderName}`)
}

const uploadMinio = async () => {
    console.log('done')
}

(async () => {
    const qualities = [
        {
            size: '?x240',
            videoRate: '300k',
            audioRate: '64k',
            version: 240
        },
        {
            size: '?x360',
            videoRate: '700k',
            audioRate: '128k',
            version: 360
        },
        {
            size: '?x480',
            videoRate: '1500k',
            audioRate: '128k',
            version: 480
        },
        {
            size: '?x720',
            videoRate: '3000k',
            audioRate: '192k',
            version: 720
        },
        {
            size: '?x1080',
            videoRate: '5000k',
            audioRate: '192k',
            version: 1080
        },
        {
            size: '?x1440',
            videoRate: '12000k',
            audioRate: '192k',
            version: 1440
        },
        {
            size: '?x2160',
            videoRate: '10000k',
            audioRate: '320k',
            version: 2160
        }
    ]
    const direct_url = './test.mp4'
    const resolution = await readResolution(direct_url)
    const folderName = await genFolder()
    console.log(`create folder: ${folderName}`)
    if (resolution) {
        for (const quality of qualities) {
            console.log('quality: ', quality.size)
            if (quality.version > resolution) break
            // if (quality.version === resolution) {
            await convertM3u8(quality, direct_url, folderName)
            // }
        }
        await uploadMinio()
        await deleteFolder(folderName)
        console.log('doneeeee')
    }
})()
