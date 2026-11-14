import { Composition } from "remotion";
import { Ad, DURATION } from "./Ad";

export const Root = () => (
  <>
    <Composition id="RelevoAd" component={Ad} durationInFrames={DURATION} fps={30} width={1920} height={1080} defaultProps={{ from: 1, to: 12 }} />
  </>
);
