export const isAppleSilicon = () => {
  try {
    // Best guess if the device uses Apple Silicon: https://stackoverflow.com/a/65412357
    const w = document.createElement("canvas").getContext("webgl");
    if (w == null) {
      return false;
    }
    const d = w.getExtension("WEBGL_debug_renderer_info");
    const g = (d && w.getParameter(d.UNMASKED_RENDERER_WEBGL)) || "";
    if (g.match(/Apple/) && !g.match(/Apple GPU/)) {
      return true;
    }

    if (
      // @ts-expect-error - Object is possibly 'null'
      w.getSupportedExtensions().includes("WEBGL_compressed_texture_s3tc_srgb")
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
};

export default isAppleSilicon;