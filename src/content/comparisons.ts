import type { Comparison, QuizItem } from './types';

export const COMPARISONS: Comparison[] = [
  {
    id: 'full-flat', title: 'Full vs flat at the same leanness', a: 'full', b: 'flat', aLabel: 'Full', bLabel: 'Flat',
    focus: 'full', view: 'front',
    note: 'Only belly roundness differs. Both sides keep the same fat layer, separation and striations, so flat does not mean soft. Zoom to the delts, pecs and arms. The difference is exaggerated for teaching; measured glycogen effects are a few percent of muscle thickness.',
  },
  {
    id: 'sharp-spilled', title: 'Full and sharp vs full and soft ("spilled")', a: 'stageReady', b: 'spilled', aLabel: 'Full & sharp', bLabel: 'Spilled over',
    focus: 'abs', view: 'front',
    note: 'Both sides are equally full. B has shallower, softer borders and fewer fine lines. People call B "spilled over" and blame water under the skin, but that mechanism has not been shown, and softness from fat would look the same.',
  },
  {
    id: 'small-big', title: 'Lean with less muscle vs bigger but softer', a: 'smallLean', b: 'big', aLabel: 'Smaller, very lean', bLabel: 'Bigger, softer',
    focus: 'full', view: 'front',
    note: 'A has less muscle but deep detail; B has more muscle under more soft tissue. People often read the leaner body as bigger. Compare the outline width at the shoulders and thighs, then the detail at the abs.',
  },
  {
    id: 'sep-stri', title: 'Separation vs striations', a: 'separation', b: 'striations', aLabel: 'More separation', bLabel: 'More striations',
    focus: 'shoulders', view: 'threeQuarter',
    note: 'Separation is the valley between whole muscles or heads (delt–pec, delt–arm). Striations are fine lines inside one belly, along the fibers (the fan across the pec, lines on each delt head). Rulebooks treat striations as a level beyond separation.',
  },
  {
    id: 'mature-smooth', title: '"Mature / grainy" vs smoother, same size and leanness', a: 'mature', b: 'smoothDetail', aLabel: 'Mature / grainy', bLabel: 'Smoother',
    focus: 'back', view: 'back',
    note: 'Size, frame and fat are identical. A shows faint splits between muscle heads and a fine fiber-aligned grain. This is how people describe "maturity"; no tissue change behind it has been demonstrated, and it is not an age effect.',
  },
  {
    id: 'dry-watery', title: 'Dry vs watery at the same size', a: 'dry', b: 'watery', aLabel: 'Dry', bLabel: 'Watery / smooth',
    focus: 'abs', view: 'front',
    note: 'Volume is held equal. Dry = sharper surface: deep grooves, striations, veins. Watery = an even blur. The names point at water, but the visible difference is surface sharpness, and the water explanation is unproven.',
  },
  {
    id: 'pump', title: 'Pumped vs unpumped', a: 'pumped', b: 'unpumped', aLabel: 'Pumped', bLabel: 'Unpumped',
    focus: 'arms', view: 'front',
    note: 'A pump swells the worked muscles (ultrasound thickness up about 7–19%) and raises veins; it fades toward baseline within about 15–30 minutes. The model shows it on the whole body for simplicity.',
  },
  {
    id: 'veins', title: 'Vascular vs not vascular', a: 'vascular', b: 'lowVascular', aLabel: 'Vascular', bLabel: 'Few visible veins',
    focus: 'forearms', view: 'front',
    note: 'Same leanness. Veins depend on fat over them, venous filling (heat, exercise, arm position) and individual vein layout. Visible veins are not evidence of being "dry".',
  },
  {
    id: 'light', title: 'Same body, different light', a: 'stage', b: 'stage', aLabel: 'Neutral light', bLabel: 'Stage light',
    focus: 'abs', view: 'front', lighting: { a: 'neutral', b: 'stage' },
    note: 'Identical body settings. Hard top light leaves the lower side of every groove in shadow, so B looks more defined. This is why this tool uses neutral light for all muscle comparisons.',
  },
  {
    id: 'lean-offseason', title: 'Off-season vs stage condition', a: 'offseason', b: 'stageReady', aLabel: 'Off-season / soft', bLabel: 'Stage-ready',
    focus: 'full', view: 'front',
    note: 'The off-season side carries more soft tissue, mostly at the waist, lower abdomen and lower back. The distribution is illustrative; people differ.',
  },
];

export const QUIZ: QuizItem[] = [
  {
    id: 'q-flat', question: 'Which side looks flatter?', target: 'flat', other: 'full', focus: 'shoulders', view: 'threeQuarter',
    regions: ['shoulders', 'chest', 'arms'],
    explain: 'The flatter side has less domed delt, pec and arm bellies. Its grooves and fiber lines are just as sharp, which is the clue that it is flat, not soft.',
    ambiguity: '"Flat" and "smaller" are easy to confuse: from one angle, less roundness can read as less muscle. Compare the outline curvature, not the width.',
  },
  {
    id: 'q-sep', question: 'Which side shows more separation?', target: 'separation', other: 'striations', focus: 'shoulders', view: 'threeQuarter',
    regions: ['shoulders', 'chest', 'arms'],
    explain: 'Separation is the valley between whole muscles: look at the delt–pec and delt–arm borders. The other side has shallower borders but more fine lines inside the bellies.',
    ambiguity: 'Both sides look "detailed", and many people use "separated" loosely for any surface detail. Judges use it for borders between muscles.',
  },
  {
    id: 'q-stri', question: 'Which side is more striated?', target: 'striations', other: 'separation', focus: 'chest', view: 'front',
    regions: ['chest', 'shoulders'],
    explain: 'Striations are the fine lines that fan across the pec toward the upper arm and run down each delt head. They follow the fiber direction.',
  },
  {
    id: 'q-spill', question: 'Both sides are equally full. Which one would people call "spilled over"?', target: 'spilled', other: 'stageReady', focus: 'abs', view: 'front',
    regions: ['abs', 'obliques', 'chest'],
    explain: 'The spilled side keeps its volume but loses edge sharpness at the abs, obliques and pec–delt tie-in, and its striations fade.',
    ambiguity: 'You cannot see the cause. The same picture could be called "soft", "smooth" or "holding water", and coaches often say it is simply body fat. The water explanation has not been demonstrated.',
  },
  {
    id: 'q-veins', question: 'Which side is more vascular?', target: 'vascular', other: 'lowVascular', focus: 'forearms', view: 'front',
    regions: ['forearms', 'arms', 'abs'],
    explain: 'Look for raised paths along the forearm, both sides of the biceps and the lower abdomen.',
    ambiguity: 'People often call a vascular look "dry". That link is not supported: veins mainly reflect thin fat and how filled the veins are at the moment.',
  },
  {
    id: 'q-mature', question: 'Same size and leanness. Which side would people call more "mature" or "grainy"?', target: 'mature', other: 'smoothDetail', focus: 'back', view: 'back',
    regions: ['back', 'shoulders'],
    explain: 'The intended side has faint splits between muscle heads and a fine grain along the fibers, especially on the back and delts.',
    ambiguity: '"Mature" has two senses (a detailed, hard surface, and holding fullness through posing) and no agreed definition. Some would call the same picture "dense" or "hard".',
  },
  {
    id: 'q-dry', question: 'Which side looks drier?', target: 'dry', other: 'watery', focus: 'abs', view: 'front',
    regions: ['abs', 'obliques', 'serratus'],
    explain: 'The drier side has deeper, sharper grooves, more fiber lines and more visible veins at the same muscle volume.',
    ambiguity: '"Dry" names a claimed cause (less water under the skin) that has not been shown. What you can actually see is surface sharpness.',
  },
  {
    id: 'q-size', question: 'Which side carries more muscle?', target: 'big', other: 'smallLean', focus: 'full', view: 'front',
    regions: ['shoulders', 'arms', 'quads'],
    explain: 'The bigger side has wider shoulders, arms and thighs; it just shows less detail because more soft tissue covers it.',
    ambiguity: 'A leaner body often looks bigger than it is, and a softer one smaller. Compare outline widths, not detail.',
  },
  {
    id: 'q-pump', question: 'Which side looks pumped?', target: 'pumped', other: 'unpumped', focus: 'arms', view: 'front',
    regions: ['arms', 'forearms', 'shoulders'],
    explain: 'The pumped side has rounder, tighter arm and delt bellies and more raised veins, with the same fat layer.',
    ambiguity: 'A pump and lasting fullness look alike in a single picture; the difference is timing (minutes vs the whole day).',
  },
  {
    id: 'q-light', question: 'Which side has the deeper-looking abdominal grooves?', target: 'stage', other: 'stage', focus: 'abs', view: 'front',
    lighting: { target: 'stage', other: 'neutral' },
    regions: ['abs', 'serratus'],
    explain: 'Trick question: the bodies are identical. Only the lighting differs. Hard overhead light deepens the shadows in every groove.',
    ambiguity: 'This is why muscle comparisons in this tool use the same neutral light on both sides.',
  },
];
