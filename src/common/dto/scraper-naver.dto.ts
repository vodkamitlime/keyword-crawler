// {
// 	"_id": _id,              // uuid
// 	"title": string,         // 제목
//  "content": string,
// 	"totalViews?": number,   // 조회수
//  "publisherType": ENUM (1: naver blog, 2: naver cafe, 99: unidentified), // 발행처 타입
// 	"publisherName?": string, // 발행처 (ex. 카페명, 블로그명)
// 	"publishedAt": string (ISO8601, yyyy-MM-ddThh:mm:ss),   // 작성일
// 	"crawledAt": string (ISO8601, yyyy-MM-ddThh:mm:ss),   // 크롤링 일자
//   "parsedData": {
// 		"originalUrl": string, // 게시글 원 url
//     "parsedUrl": string,   // 크롤링용 url (html 태그 포함 버전)
//     "postId?": string,     // url 쿼리내 게시글 id
// 	}
// }
