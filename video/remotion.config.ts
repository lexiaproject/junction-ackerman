// Configuración del render: MP4 H.264 con el Chrome del sistema y WebGL por ANGLE (para Three.js)
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("src/index.ts");
Config.setCodec("h264");
Config.setCrf(17);
Config.setPixelFormat("yuv420p");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(94);
Config.setOverwriteOutput(true);
Config.setChromeMode("chrome-for-testing");
Config.setBrowserExecutable(process.env.REMOTION_CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe");
Config.setChromiumOpenGlRenderer("angle");
Config.setConcurrency(2);
