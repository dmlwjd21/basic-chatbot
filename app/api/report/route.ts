import { GoogleGenAI, Type, Schema } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { stance, messages } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const userStanceLabel =
      stance === "help" ? "떼어준다 (찬성)" : "떼어주지 않는다 (반대)";
    const aiStanceLabel =
      stance === "help" ? "떼어주지 않는다 (반대)" : "떼어준다 (찬성)";

    const debateHistoryText = messages
      .map(
        (m: { role: string; content: string }, index: number) =>
          `[${m.role === "user" ? "사용자(" + userStanceLabel + ")" : "AI(" + aiStanceLabel + ")"}] ${m.content}`
      )
      .join("\n");

    const prompt = `당신은 대한민국 최고 권위의 '깻잎논쟁 심판관'입니다.
방금 진행된 5턴간의 치열한 깻잎논쟁 토론 내역을 종합 분석하여, 정확히 3개의 평가 요소로 정리된 시각화 리포트 데이터를 JSON 형식으로 생성해주세요.

[토론 정보]
- 사용자의 입장: ${userStanceLabel}
- AI의 입장: ${aiStanceLabel}

[5턴간의 토론 전체 기록]
${debateHistoryText}

[평가해야 할 3대 요소]
1. 논리력 및 설득력 (logic): 주장의 근거가 얼마나 논리적이고 타당했는가? (0~100점)
2. 감정 및 공감도 (empathy): 연인(여자친구)의 심리와 감정선, 대인관계 맥락을 얼마나 깊이 이해하고 설득했는가? (0~100점)
3. 일관성 및 방어력 (consistency): AI의 반박과 공세에도 굴하지 않고 자신의 입장을 흔들림 없이 방어했는가? (0~100점)

[반환해야 할 JSON 형식]
- overallScore: 3개 요소의 종합 평균 점수 (0~100 정수)
- elements:
  - logic: { score: number, grade: string (예: 'S', 'A', 'B', 'C'), title: '논리력 & 설득력', commentary: '상세 평가 2~3문장', strengths: ['강점 키워드1', '강점 키워드2'] }
  - empathy: { score: number, grade: string, title: '감정 & 공감도', commentary: '상세 평가 2~3문장', strengths: ['공감 포인트1', '공감 포인트2'] }
  - consistency: { score: number, grade: string, title: '일관성 & 방어력', commentary: '상세 평가 2~3문장', strengths: ['방어 전략1', '방어 전략2'] }
- summary: 5턴 토론의 핵심 흐름과 사용자 논리의 총평 (3~4문장)
- verdict:
  - resultTitle: 토론 판정 타이틀 (예: "불꽃 튀는 깻잎 철벽 방어", "매너와 배려의 승리" 등)
  - winner: 'user' | 'ai' | 'draw'
  - punchline: 재치 있는 한 줄 총평
- highlights: 토론 중 가장 인상 깊었던 명장면 1~2개 ({ turn: number, userQuote: string, evaluation: string })
`;

    const reportSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        overallScore: { type: Type.INTEGER },
        summary: { type: Type.STRING },
        verdict: {
          type: Type.OBJECT,
          properties: {
            resultTitle: { type: Type.STRING },
            winner: { type: Type.STRING, enum: ["user", "ai", "draw"] },
            punchline: { type: Type.STRING },
          },
          required: ["resultTitle", "winner", "punchline"],
        },
        elements: {
          type: Type.OBJECT,
          properties: {
            logic: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER },
                grade: { type: Type.STRING },
                title: { type: Type.STRING },
                commentary: { type: Type.STRING },
                strengths: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["score", "grade", "title", "commentary", "strengths"],
            },
            empathy: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER },
                grade: { type: Type.STRING },
                title: { type: Type.STRING },
                commentary: { type: Type.STRING },
                strengths: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["score", "grade", "title", "commentary", "strengths"],
            },
            consistency: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER },
                grade: { type: Type.STRING },
                title: { type: Type.STRING },
                commentary: { type: Type.STRING },
                strengths: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["score", "grade", "title", "commentary", "strengths"],
            },
          },
          required: ["logic", "empathy", "consistency"],
        },
        highlights: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              turn: { type: Type.INTEGER },
              userQuote: { type: Type.STRING },
              evaluation: { type: Type.STRING },
            },
            required: ["turn", "userQuote", "evaluation"],
          },
        },
      },
      required: ["overallScore", "summary", "verdict", "elements", "highlights"],
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: reportSchema,
        temperature: 0.6,
      },
    });

    const reportJson = JSON.parse(response.text || "{}");
    return NextResponse.json({ report: reportJson });
  } catch (error: unknown) {
    console.error("Report API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "리포트 생성 실패";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

