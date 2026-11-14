import { Composition } from "remotion";
import { DURATION, FPS } from "../script";
import { Ad } from "./Ad";

export const Root = () => (
  <Composition id="RelevoAd" component={Ad} durationInFrames={DURATION * FPS} fps={FPS} width={1920} height={1080} />
);
