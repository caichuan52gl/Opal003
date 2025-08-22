const express = require("express");
const multer = require("multer");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

ffmpeg.setFfmpegPath(ffmpegPath);

// 1. 提取视频最后一帧
app.post("/extract-last-frame", upload.single("video"), (req, res) => {
  const videoPath = req.file.path;
  const outputPath = `frames/${Date.now()}-lastframe.jpg`;

  fs.mkdirSync("frames", { recursive: true });

  ffmpeg(videoPath)
    .on("end", () => {
      res.sendFile(path.resolve(outputPath));
      fs.unlinkSync(videoPath); // 删除上传的临时文件
    })
    .on("error", (err) => {
      console.error(err);
      res.status(500).send("FFmpeg error: " + err.message);
    })
    .screenshots({
      count: 1,
      timemarks: ["99%"], // 取最后一帧
      filename: path.basename(outputPath),
      folder: "frames"
    });
});

// 2. 拼接多个视频
app.post("/concat", upload.array("videos", 10), (req, res) => {
  const files = req.files.map(f => f.path);
  const outputPath = `outputs/${Date.now()}-merged.mp4`;

  fs.mkdirSync("outputs", { recursive: true });

  // FFmpeg 需要一个 list.txt
  const listFile = `uploads/${Date.now()}-list.txt`;
  fs.writeFileSync(
    listFile,
    files.map(f => `file '${path.resolve(f)}'`).join("\n")
  );

  ffmpeg()
    .input(listFile)
    .inputOptions(["-f concat", "-safe 0"])
    .outputOptions(["-c copy"])
    .save(outputPath)
    .on("end", () => {
      res.sendFile(path.resolve(outputPath));
      // 清理临时文件
      files.forEach(f => fs.unlinkSync(f));
      fs.unlinkSync(listFile);
    })
    .on("error", (err) => {
      console.error(err);
      res.status(500).send("FFmpeg concat error: " + err.message);
    });
});

// 测试用
app.get("/", (req, res) => {
  res.send("Opal Video API is running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
