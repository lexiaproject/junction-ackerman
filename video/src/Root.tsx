import { Composition } from "remotion";
import { Ad, DURATION } from "./Ad";
import { FPS } from "./lib";

export const Root = () => (
  <>
    <Composition id="RelevoAd" component={Ad} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} defaultProps={{ from: 1, to: 12 }} />
  </>
);
