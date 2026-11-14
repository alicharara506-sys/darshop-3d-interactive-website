# The DAR expert

The home hero, shop category bar, cart toast, empty product searches, and 404 page share `src/components/mascot/Mascot.tsx`. The hero uses the existing shop filters. The mascot is decorative when adjacent copy or controls convey the same message. The Lebanese Arabic copy in `src/i18n.js` and the pose descriptions in the manifest need brand review.

## Replace a pose

Keep the filenames in `public/mascot/` and replace the corresponding WebP. The current assets are transparent cutouts prepared from the supplied artwork. Export to the shared 520 × 800 canvas with the full character and props visible, and align the boots and head with the other poses. Start around WebP quality 80 with alpha quality 90. Check the silhouette over both dark and light backgrounds, especially near the glasses, hands, and dark overalls. The hero loads the idle pose first and warms a couple of likely poses at low priority.

The filenames are `idle.webp`, `wave.webp`, `point.webp`, `thumbs-up.webp`, `head-scratch.webp`, `tools.webp`, `electrical.webp`, `plumbing.webp`, `building-materials.webp`, and `paint.webp`. The current canvas has enough resolution for the displayed sizes, including on high-density screens.

## Supply the idle loop

Add `idle-loop.webm` and `idle-loop.mp4` to `public/mascot/` and include both files in the next deployment. Use a seamless 3–5 second loop with no audio track. Match the `idle.webp` framing and first frame. Export the WebM as VP9 with alpha (`yuva420p`). For the MP4, use HEVC with alpha for Safari or a flat Off White (`#F2EFE9`) background as a fallback. Test both encodes on their target browsers. The home page detects the supplied files. The player loads when visible, pauses offscreen and in hidden tabs, and shows `idle.webp` with reduced motion or if playback fails.

## Add a pose

Export a new WebP to `public/mascot/`. Add its key, file, intrinsic dimensions, and EN/AR/FR alt descriptions in `src/components/mascot/mascot.config.ts`. Use the key as the `pose` prop. Use `flip` for art that should reverse direction in Arabic. `wave.webp` is available for a future standalone coming-soon page.
