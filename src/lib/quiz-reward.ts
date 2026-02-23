import { GoogleGenerativeAI } from "@google/generative-ai";
import { CHARACTERS, getCharacter } from "@/data/characters";
import type { CharacterId } from "@/data/characters";
import type { WordItem } from "@/types/word";

const MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.0-flash";

function buildProfileList(): string {
  return CHARACTERS.map(
    (c) => `- ${c.name}: ${c.age}歳, ${c.job}. ${c.description}`
  ).join("\n");
}

/** 10単語を最も自然に使えるキャラを1人選ぶ */
export async function selectCharacterForWords(
  apiKey: string,
  words: WordItem[]
): Promise<CharacterId> {
  const wordList = words.map((w) => `${w.spanish}（${w.japanese}）`).join(", ");
  const profiles = buildProfileList();
  const prompt = `以下の単語リストと、以下のキャラクタープロフィールを見て、最も自然に会話でこれらの単語を使えるキャラクターを1人選んでJSONのみ返してください。他の説明は不要です。
形式: {"character": "Javi"}

単語リスト:
${wordList}

キャラクタープロフィール:
${profiles}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  const text = (result.response.text() ?? "").trim();
  const match = text.match(/"character"\s*:\s*"([^"]+)"/);
  const name = match ? match[1].trim() : "";
  const found = CHARACTERS.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  return found ? found.id : CHARACTERS[0].id;
}

/** 指定キャラが10単語を自然に使った短文を1つ生成 */
export async function generateMessageWithWords(
  apiKey: string,
  characterId: CharacterId,
  words: WordItem[]
): Promise<string> {
  const char = getCharacter(characterId);
  const wordList = words.map((w) => w.spanish).join(", ");
  const prompt = `${char?.systemPrompt ?? ""}

以下の単語をすべて自然に会話文の中で使って、あなた（${char?.name ?? characterId}）が相手に送る短いメッセージを1つ書いてください。マッチングアプリのチャットのようなカジュアルな文体で、1〜3文程度。JSONや説明は不要で、メッセージ本文だけ返してください。

使う単語: ${wordList}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  const text = (result.response.text() ?? "").trim();
  return text.replace(/^["']|["']$/g, "").slice(0, 500);
}
