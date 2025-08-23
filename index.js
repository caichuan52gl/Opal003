const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

// 确保目录存在
fs.mkdirSync("uploads", { recursive: true });
fs.mkdirSync("frames", { recursive: true });
fs.mkdirSync("outputs", { recursive: true });

// 提取视频最后一帧
app.post("/extract-last-frame", upload.single("video"), (req, res) => {
  const videoPath = req.file.path;
  const outputPath = `frames/${Date.now()}-lastframe.jpg`;

  ffmpeg(videoPath)
    .output(outputPath)
    .outputOptions("-vframes 1", "-f image2") // 确保生成图片格式
    .on("end", () => {
      res.sendFile(path.resolve(outputPath));
      fs.unlinkSync(videoPath); // 删除上传的视频文件
    })
    .on("error", (err) => {
      console.error(err);
      res.status(500).send("FFmpeg error: " + err.message);
    })
    .run();
});

// 拼接多个视频
app.post("/concat", upload.array("videos", 10), (req, res) => {
  const files = req.files.map(f => f.path);
  const outputPath = `outputs/${Date.now()}-merged.mp4`;

  // 生成视频列表文件
  const listFile = `uploads/${Date.now()}-list.txt`;
  fs.writeFileSync(
    listFile,
    files.map(f => `file '${path.resolve(f)}'`).join("\n")
  );

  ffmpeg()
    .input(listFile)
    .inputOptions(["-f concat", "-safe 0"])
    .outputOptions(["-c:v copy", "-c:a copy"]) // 使用相同的编码拷贝流
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

// 测试用接口，检查服务是否正常
app.get("/", (req, res) => {
  res.send("Opal Video API is running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
