const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Seoul",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Seoul",
});

export const formatDate = (d: Date | string) => dateFormatter.format(new Date(d));
export const formatDateTime = (d: Date | string) => dateTimeFormatter.format(new Date(d));
export const toIso = (d: Date | string) => new Date(d).toISOString();
