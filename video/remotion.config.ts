// Configuración del render: MP4 H.264 a 60 fps con el Chrome del sistema (sin descargar otro navegador)
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("src/index.ts");
Config.setCodec("h264");
Config.setCrf(16);
Config.setPixelFormat("yuv420p");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setChromeMode("chrome-for-testing");
Config.setBrowserExecutable(process.env.REMOTION_CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe");
