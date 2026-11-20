import { Type } from '@google/genai';
import type { DbInstance } from '../../db/database';
import type { GraphicArtDirection, GraphicDesignType, PlatformKey } from '../../../src/shared/api-contracts';
import { loadPermittedWorkspaceContext, runStructuredGeminiModule } from '../geminiClient';

export async function runGraphicDesignAssistanceModule(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    graphicType: GraphicDesignType;
    platformKey: PlatformKey;
    aspectRatio: string;
    brief: string;
    includeLogo?: boolean;
  }
): Promise<{ artDirection: GraphicArtDirection; creditsRemaining: number }> {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);

  const prompt = `Create an enterprise graphic design blueprint and detailed image generation prompt.
Graphic Type: ${params.graphicType.replace(/_/g, ' ')}
Platform: ${params.platformKey.toUpperCase()}
Aspect Ratio: ${params.aspectRatio}
Brand Name: ${ctx.brand.brandName}
Brand Colors: primary=${ctx.brand.primaryColor}, secondary=${ctx.brand.secondaryColor}, accent=${ctx.brand.accentColor}
Include Brand Logo Placement: ${params.includeLogo !== false ? 'Yes — reserve a clean corner safe-zone for the brand logo' : 'Optional'}
Design Brief: ${params.brief}
Tone of Voice: ${ctx.brand.toneOfVoice}
Banned Words: ${ctx.brand.bannedWords.join(', ') || 'None'}

Produce sharp, scannable flyer/graphic copy (headline <= 60 chars, subheadline <= 120 chars, CTA <= 32 chars) plus a vivid, copyright-safe imagePrompt describing composition, lighting, colors, and clean visual space.`;

  const result = await runStructuredGeminiModule<GraphicArtDirection>(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: 'graphic_design_assistance',
    systemInstruction:
      'You are an Executive Creative Director designing high-impact social media flyers, banners, carousels, and infographics.',
    prompt,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        headline: { type: Type.STRING },
        subheadline: { type: Type.STRING },
        callToAction: { type: Type.STRING },
        layoutStyle: { type: Type.STRING },
        visualElements: { type: Type.ARRAY, items: { type: Type.STRING } },
        colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
        typographyNotes: { type: Type.STRING },
        imagePrompt: { type: Type.STRING },
        suggestedCaption: { type: Type.STRING },
      },
      required: [
        'headline',
        'subheadline',
        'callToAction',
        'layoutStyle',
        'visualElements',
        'colorPalette',
        'typographyNotes',
        'imagePrompt',
        'suggestedCaption',
      ],
    },
  });

  return {
    artDirection: result.data,
    creditsRemaining: result.creditsRemaining,
  };
}
