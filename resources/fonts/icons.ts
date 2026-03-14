export type IconsId =
  | "pinpoint-logo";

export type IconsKey =
  | "PinpointLogo";

export enum Icons {
  PinpointLogo = "pinpoint-logo",
}

export const ICONS_CODEPOINTS: { [key in Icons]: string } = {
  [Icons.PinpointLogo]: "61697",
};
