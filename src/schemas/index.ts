import { z } from 'zod';

// Capture mode types
export type CaptureMode = 'pick' | 'full';

// Bounding box
export const BoundingBoxSchema = z.object({
  top: z.number(),
  left: z.number(),
  width: z.number(),
  height: z.number(),
  right: z.number().optional(),
  bottom: z.number().optional(),
});
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

// Selector with confidence
export const SelectorSchema = z.object({
  selector: z.string(),
  confidence: z.number().min(0).max(1),
  method: z.enum(['data-attr' as const, 'id' as const, 'role-label' as const, 'class-combo' as const, 'position' as const]),
});
export type Selector = z.infer<typeof SelectorSchema>;

// Identity information
export const IdentitySchema = z.object({
  tag: z.string(),
  id: z.string().optional(),
  classes: z.array(z.string()),
  role: z.string().optional(),
  ariaLabel: z.string().optional(),
  dataAttributes: z.record(z.string(), z.string()).optional(),
  text: z.string().optional(),
  accessibleName: z.string().optional(),
});
export type Identity = z.infer<typeof IdentitySchema>;

// DOM context
export const DomContextSchema = z.object({
  element: z.object({
    html: z.string(),
    text: z.string().optional(),
  }),
  parents: z.array(z.object({
    html: z.string(),
    level: z.number(),
  })).optional(),
});
export type DomContext = z.infer<typeof DomContextSchema>;

// Layout information
export const LayoutSchema = z.object({
  bbox: BoundingBoxSchema,
  parentBbox: BoundingBoxSchema.optional(),
  scrollOffset: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
  }).optional(),
  devicePixelRatio: z.number().default(1),
});
export type Layout = z.infer<typeof LayoutSchema>;

// Style information
export const StylesSchema = z.object({
  computed: z.record(z.string(), z.string()).optional(),
  diff: z.record(z.string(), z.string()).optional(),
  classes: z.array(z.string()).optional(),
});
export type Styles = z.infer<typeof StylesSchema>;

// Screenshot
export const ScreenshotSchema = z.object({
  path: z.string(),
  base64: z.string().optional(),
  mimeType: z.string().default('image/png'),
});
export type Screenshot = z.infer<typeof ScreenshotSchema>;

// Source file location
export const SourceLocationSchema = z.object({
  filePath: z.string(),
  line: z.number().optional(),
  column: z.number().optional(),
  confidence: z.number().min(0).max(1),
  method: z.enum(['sourcemap', 'grep-data-attr', 'grep-id', 'grep-aria', 'grep-text', 'grep-class', 'grep-html']),
});
export type SourceLocation = z.infer<typeof SourceLocationSchema>;

// Complete context (internal format)
export const MaxContextSchema = z.object({
  meta: z.object({
    url: z.string(),
    timestamp: z.string(),
    viewport: z.object({
      width: z.number(),
      height: z.number(),
    }),
    dpr: z.number(),
  }),
  identity: IdentitySchema,
  selectors: z.object({
    primary: SelectorSchema,
    alternates: z.array(SelectorSchema).optional(),
  }),
  dom: DomContextSchema,
  layout: LayoutSchema,
  styles: StylesSchema,
  visual: ScreenshotSchema.optional(),
  sourceLocation: SourceLocationSchema.optional(),
  reactComponent: z.string().optional(),
  redaction: z.object({
    truncatedFields: z.array(z.string()).optional(),
    removed: z.array(z.string()).optional(),
  }).optional(),
});
export type MaxContext = z.infer<typeof MaxContextSchema>;

// Export payloads for different modes
export const PickPayloadSchema = MaxContextSchema.pick({
  identity: true,
  selectors: true,
  dom: true,
  layout: true,
  styles: true,
  visual: true,
  sourceLocation: true,
  reactComponent: true,
}).extend({
  mode: z.literal('pick' as const),
});

export const FullPayloadSchema = MaxContextSchema.pick({
  identity: true,
  selectors: true,
  dom: true,
  layout: true,
  styles: true,
  visual: true,
  sourceLocation: true,
  reactComponent: true,
}).extend({
  mode: z.literal('full' as const),
});

export type PickPayload = z.infer<typeof PickPayloadSchema>;
export type FullPayload = z.infer<typeof FullPayloadSchema>;

export type ExportPayload = PickPayload | FullPayload;
