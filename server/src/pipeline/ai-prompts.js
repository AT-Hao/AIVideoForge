/**
 * AI Prompt 模板（重写版）
 *
 * 统一为「单 Prompt 能力适配」：以 parseResult + StyleTemplate 为输入，
 * 让模型一次性输出符合 VideoStyleProfile 的完整结构，字段直接对齐
 * src/remotion/capabilities/types.ts 的 Capability 定义。
 */

const FPS = 30;

function safeJSON(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return '{}';
  }
}

/**
 * 用于阶段 2「Remotion 能力适配」的统一 Prompt。
 *
 * @param {object} parseResult - 阶段 1 视频内容解析结果（含 scenes/emotions/transitions/summary）
 * @param {object} template    - 蒸馏后的 StyleTemplate（colorGradeBaseline / transitionDefault / ...）
 * @returns {string} 提示词
 */
export function adaptCapabilitiesPrompt(parseResult, template) {
  const scenes = parseResult?.scenes || [];
  const emotions = parseResult?.emotions || [];
  const summary = parseResult?.summary || '';
  const transitionsHint = parseResult?.transitions || [];

  return [
    '你是一位资深视频后期总监 (Director of Post-Production)。',
    '你的任务是把【目标风格模板】适配到【当前视频】，输出一份可直接被 Remotion 渲染管线消费的 JSON。',
    '',
    '【硬性规则】',
    `1. fps 固定为 ${FPS}，所有 startFrame / endFrame 必须按 ${FPS}fps 由秒数换算 (frame = round(sec * ${FPS}))。`,
    `2. colorGrade.scenes 数组长度必须等于场景数量 (${scenes.length})，且 sceneIndex 与下方场景列表一一对应。`,
    `3. transitions 数组长度必须等于 ${Math.max(scenes.length - 1, 0)} (相邻场景对数量)。`,
    '4. 仅输出 JSON，不要附带任何解释文字、Markdown 代码块或注释。',
    '5. 字段命名、枚举值必须严格匹配下方 Schema。未知值用合理默认值，不得新增字段。',
    '',
    '【目标风格模板（已蒸馏，跨视频可复用）】',
    safeJSON(template),
    '',
    '【当前视频解析结果】',
    `summary: ${summary}`,
    `scenes (${scenes.length}): ${safeJSON(scenes)}`,
    `emotions: ${safeJSON(emotions)}`,
    `transitions(原视频转场提示): ${safeJSON(transitionsHint)}`,
    '',
    '【输出 JSON Schema】',
    '{',
    '  "summary": string,                                       // 直接复用上面的 summary',
    '  "styleDescription": string,                              // 一句话描述适配后的整体风格',
    '  "recommendedFilter": string,                             // 整体推荐 CSS filter，如 "brightness(1.05) contrast(1.1)"',
    '  "pacing": "fast" | "medium" | "slow",',
    '  "colorGrade": {',
    '    "scenes": [',
    '      {',
    '        "sceneIndex": number,',
    '        "startFrame": number,',
    '        "endFrame": number,',
    '        "filter": string,                                  // 该场景 CSS filter',
    '        "brightness": number,                              // 0.5 ~ 1.5',
    '        "contrast": number,                                // 0.5 ~ 1.5',
    '        "saturation": number,                              // 0 ~ 1.5',
    '        "temperature": number,                             // -1 ~ 1',
    '        "tint": number,                                    // -1 ~ 1',
    '        "vignette": number                                 // 0 ~ 1',
    '      }',
    '    ]',
    '  },',
    '  "transitions": [',
    '    {',
    '      "fromScene": number,',
    '      "toScene": number,',
    '      "atFrame": number,                                   // 前一个场景的 endFrame',
    '      "type": "fade" | "slideLeft" | "slideRight" | "wipe" | "zoom" | "dissolve",',
    '      "durationFrames": number,                            // 通常 8 ~ 30',
    '      "easing": "linear" | "spring" | "ease-in" | "ease-out" | "ease-in-out",',
    '      "intensity": number                                  // 0 ~ 1',
    '    }',
    '  ],',
    '  "subtitleStyle": {',
    '    "fontFamily": string,',
    '    "fontSize": number,',
    '    "color": string,',
    '    "animation": "typewriter" | "fadeIn" | "slideUp" | "bounce",',
    '    "position": "bottom" | "center" | "top",',
    '    "fontWeight": number,',
    '    "letterSpacing": number,',
    '    "outlineColor": string,',
    '    "backgroundColor": string,',
    '    "padding": number',
    '  },',
    '  "effects": [',
    '    {',
    '      "startFrame": number,',
    '      "endFrame": number,',
    '      "type": "vignette" | "filmGrain" | "lightLeak" | "glitch" | "chromaticAberration" | "none",',
    '      "intensity": number,                                 // 0 ~ 1',
    '      "color": string                                      // 可选，缺省可省略',
    '    }',
    '  ],',
    '  "audioMix": {',
    '    "mood": "energetic" | "calm" | "melancholic" | "epic" | "playful" | "tense",',
    '    "genre": "cinematic" | "electronic" | "acoustic" | "lofi" | "orchestral" | "rock" | "ambient",',
    '    "bpm": number,',
    '    "masterVolume": number,                                // 0 ~ 1',
    '    "tracks": []                                           // 始终输出空数组，由用户后续挂载',
    '  }',
    '}',
  ].join('\n');
}
