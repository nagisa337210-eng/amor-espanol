/**
 * words.json の1件の形式に合わせた型定義
 */
export type WordItem = {
  id: number;
  spanish: string;
  japanese: string;
  category?: string;
};
