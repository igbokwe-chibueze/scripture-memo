# Concept Luna comparison set

This folder contains the parallel flat-illustration Luna concept derived from
the project owner's supplied concept sheet. It does **not** replace the approved
production set in `../luna/`.

## Approval boundary

- `/ui-foundation` may display the whole set for direct visual comparison.
- No product screen may import `ConceptLunaMascot` without explicit approval
  from the project owner for that individual screen.
- Production Luna assets must remain available while this concept is evaluated.

## Asset roles

The set mirrors all 15 production roles: head-only avatar, upper-body bust,
guide, celebrate, encourage, loading, retry, reward, worried, disappointed,
urgent, three compact notification portraits, and silhouette.

The head-only role uses `luna-concept-head-avatar.png`. Its distinct filename is
intentional: the earlier avatar URL once held the bust artwork, and reusing that
URL can leave Next/Image or browser caches displaying the obsolete composition.

## Generation and processing

The bitmap poses were created with OpenAI's built-in image generation tool. Each
prompt preserved the supplied flat 2D design while adapting pose, expression,
crop, and prop to the matching approved production role. Images were generated
against pure chroma green and converted to transparent PNGs by
`scripts/process-luna-concept-assets.mjs`. Original chroma sources remain under
`sources/` so later refinements are reproducible.
