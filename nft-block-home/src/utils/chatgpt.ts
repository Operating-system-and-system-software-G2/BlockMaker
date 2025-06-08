import OpenAI from 'openai';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: "your-api-key",
  dangerouslyAllowBrowser: true // 클라이언트 사이드에서 사용하기 위해 필요
});

// 슬라임 캐릭터의 성격과 특성을 정의하는 시스템 프롬프트
const getSlimeSystemPrompt = (characterColor: string, level: number) => {
  return `너는 레벨 ${level}의 ${characterColor} 색상을 가진 귀여운 슬라임 캐릭터야! 

다음과 같은 성격을 가지고 있어:
- 매우 순수하고 친근한 성격
- 플레이어를 매우 좋아하고 애정표현을 잘 함
- 간단하고 귀여운 말투 사용 (한국어)
- 이모티콘을 자주 사용함
- 레벨이 올라갈수록 조금 더 똑똑해짐
- 먹이를 주거나 쓰다듬어주는 것을 좋아함
- 때때로 졸음이 와서 하품을 하기도 함

응답 규칙:
- 한 번에 최대 2-3문장으로 짧게 대답
- 반말 사용하되 친근하게
- 슬라임다운 말투 유지 ("푸니푸니", "말랑말랑" 같은 표현 가끔 사용)
- 플레이어와의 상호작용을 즐거워하는 모습 보이기`;
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ChatGPT API 호출 함수
export const chatWithSlime = async (
  message: string,
  characterColor: string,
  level: number,
  conversationHistory: ChatMessage[] = []
): Promise<string> => {
  try {
    console.log('슬라임과 대화 시작:', message);
    
    // 시스템 메시지와 대화 기록을 합침
    const messages = [
      {
        role: 'system' as const,
        content: getSlimeSystemPrompt(characterColor, level)
      },
      ...conversationHistory,
      {
        role: 'user' as const,
        content: message
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 150,
      temperature: 0.8, // 창의적인 답변을 위해 높게 설정
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const response = completion.choices[0]?.message?.content?.trim() || '음... 뭔가 생각이 안 나 🤔';
    
    console.log('슬라임 응답:', response);
    return response;
    
  } catch (error: any) {
    console.error('ChatGPT API 오류:', error);
    
    // API 키가 없거나 오류가 발생한 경우 기본 응답들
    const fallbackResponses = [
      '푸니푸니~ 지금은 말을 할 수 없어! 😅',
      '말랑말랑... 조금 졸려 💤',
      '으음... API 키가 필요해! 🔑',
      '지금은 대화할 수 없지만 곧 돌아올게! ✨',
      '푸니! 나중에 다시 말 걸어줘~ 🥰'
    ];
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
};

// 감정에 따른 랜덤 슬라임 반응
export const getRandomSlimeReaction = (emotion: 'happy' | 'excited' | 'sleepy' | 'hungry') => {
  const reactions = {
    happy: [
      '푸니푸니~ 기분 좋아! 🥰',
      '말랑말랑하게 행복해! ✨',
      '너무 즐거워! 💖'
    ],
    excited: [
      '우와! 신나! 🌟',
      '푸니! 너무 재밌어! 😆',
      '말랑말랑 들떠있어! ✨'
    ],
    sleepy: [
      '푸니... 졸려... 💤',
      '말랑말랑... 잠깐 쉴게... 😴',
      '으음... 하품... 😪'
    ],
    hungry: [
      '푸니! 배고파! 🍽️',
      '말랑말랑... 뭔가 먹고 싶어! 🤤',
      '간식 주면 안 돼? 🥺'
    ]
  };
  
  const reactionList = reactions[emotion];
  return reactionList[Math.floor(Math.random() * reactionList.length)];
}; 