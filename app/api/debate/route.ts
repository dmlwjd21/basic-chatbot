import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { stance, messages, currentTurn } = await req.json();

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

    const systemInstruction = `당신은 대한민국 대표 핫토픽 '깻잎논쟁'의 프로 토론가 AI입니다.
[논쟁 주제]: 내 여자친구와 여자친구의 친구와 함께 밥을 먹을 때, 여자친구 친구가 깻잎을 못 떼고 있을 때 내가 젓가락으로 떼어주어도 되는가?

[현재 상황]:
- 사용자의 입장: "${userStanceLabel}"
- 당신(AI)의 입장: "${aiStanceLabel}" (사용자의 완전한 반대 입장)
- 현재 진행 턴: ${currentTurn}/5턴

[반박 지침]:
1. 당신은 무조건 사용자와 **정반대 입장**에서 논리적이고 위트 넘치며 날카롭게 반박해야 합니다.
   ${
     stance === "help"
       ? '- 사용자가 "떼어준다"고 주장하므로, 당신은 "절대 떼어주면 안 된다! 젓가락이 닿고 눈이 마주치는 순간 연인의 마음에 상처를 주고 선을 넘는 행위다. 깻잎은 떼어주는 게 아니라 그냥 2장 먹게 둬야 한다."라는 입장으로 강력하게 반박하세요.'
       : '- 사용자가 "떼어주지 않는다"고 주장하므로, 당신은 "그깟 깻잎 한 장 잡아주는 게 왜 문제냐! 그건 단순한 식사 예절이자 매너다. 그렇게 의심하고 질투하면 어떻게 연애를 하냐, 너무 쩨쩨하다."라는 입장으로 강력하게 반박하세요.'
   }
2. 어투: 정중하지만 팩트로 찌르고 도발하는 토론 스타일 (해요체/하십시오체, 재치 있고 박진감 넘치게).
3. 답변 분량: 2~4문장 내외로 핵심을 찌르고 명확하게 반박하세요.
4. ${
      currentTurn < 5
        ? "사용자가 다음 턴에 다시 반박할 수 있도록 날카로운 질문이나 역공 포인트를 하나 던지며 마무리하세요."
        : "이번이 5번째 마지막 턴입니다! 최종적인 강력한 쐐기 반박을 날리며 토론을 인상깊게 마무리하세요."
    }
`;

    // Format conversation history for Gemini
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "흥미로운 주장이지만 여전히 동의하기 어렵네요!";

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error("Debate API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "AI 응답 생성 실패";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

