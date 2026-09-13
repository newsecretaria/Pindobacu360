import { Config } from "@remotion/cli/config";

/**
 * Config da CLI do Remotion. Os assets do projeto ficam em assets/ (e nao em
 * public/), entao staticFile() resolve a partir dali.
 */
Config.setPublicDir("assets");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
