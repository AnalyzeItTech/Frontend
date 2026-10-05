export interface ChangelogItem {
  title: string;
  body: string;
  rollingOut?: boolean;
}
export interface ChangelogEntry {
  date: string;
  items: ChangelogItem[];
}
export const CHANGELOG: ChangelogEntry[];
