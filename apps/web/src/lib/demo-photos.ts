/** Stand-in photos for lots registered without pictures, one per category, hotlinked from Wikimedia Commons under
 *  their own licences. They illustrate the category, not the token, and every place that shows one says so. */
export type DemoPhoto = { src: string; credit: string; href: string };

const W = "https://upload.wikimedia.org/wikipedia/commons/thumb";
const PHOTOS: Record<string, DemoPhoto> = {
  watch: {
    src: `${W}/8/8f/Rolex_Submariner_ref._16618_Sultan_Dial.jpg/1280px-Rolex_Submariner_ref._16618_Sultan_Dial.jpg`,
    credit: "EMore98, CC BY-SA 4.0",
    href: "https://commons.wikimedia.org/wiki/File:Rolex_Submariner_ref._16618_Sultan_Dial.jpg",
  },
  art: {
    src: `${W}/8/8a/Landscape_at_Sunset_MET_DP146446.jpg/1280px-Landscape_at_Sunset_MET_DP146446.jpg`,
    credit: "Aert van der Neer, The Met, CC0",
    href: "https://commons.wikimedia.org/wiki/File:Landscape_at_Sunset_MET_DP146446.jpg",
  },
  digital_collectible: {
    src: `${W}/c/c5/Vassily_Kandinsky%2C_1936_-_Composition_9.jpg/1280px-Vassily_Kandinsky%2C_1936_-_Composition_9.jpg`,
    credit: "Vassily Kandinsky, public domain",
    href: "https://commons.wikimedia.org/wiki/File:Vassily_Kandinsky,_1936_-_Composition_9.jpg",
  },
  other: {
    src: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Vintage_Camera.jpg",
    credit: "Shein, CC BY 2.0",
    href: "https://commons.wikimedia.org/wiki/File:Vintage_Camera.jpg",
  },
};

export const demoPhoto = (category?: string): DemoPhoto => PHOTOS[category ?? ""] ?? PHOTOS.other;
