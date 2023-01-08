import { ApiProperty } from '@nestjs/swagger';

export class NaverViewDTO {
  @ApiProperty({ type: String, description: 'YYYY-MM-DD', required: true })
  발행일: string;
  @ApiProperty({
    type: String,
    description: '네이버 블로그, 네이버 카페',
    required: true,
  })
  발행처: string;
  @ApiProperty({ type: String, description: '블로그명/카페명', required: true })
  출처명: string;
  @ApiProperty({ type: String, description: '글 제목', required: true })
  제목: string;
  @ApiProperty({
    type: Number,
    description: '게시글 조회수 (조회수 볼 수 없는 게시글의 경우, - 표시)',
    required: false,
  })
  조회수?: number;
  @ApiProperty({
    type: Number,
    description: '게시글 댓글수 (댓글을 달 수 없는 게시글의 경우, - 표시)',
    required: false,
  })
  댓글수?: number;
  @ApiProperty({
    type: Number,
    description: '게시글 내 지정된 부정 키워드 등장 빈도',
    required: true,
  })
  '부정 키워드 개수': number;
  @ApiProperty({
    type: String,
    description: '게시글 내 등장한 부정 키워드별 빈도 => 키워드(빈도)',
    required: true,
  })
  '부정 키워드': string;
  @ApiProperty({ type: String, description: '게시글 본문', required: true })
  본문: string;
  @ApiProperty({ type: String, description: '원문 링크', required: true })
  '원문 링크': string;

  constructor(e) {
    this.발행일 = e?.publishedAt;
    this.발행처 = e?.publisherType === 1 ? '네이버 블로그' : '네이버 카페';
    this.출처명 = e?.publisherName;
    this.제목 = e?.title;
    this.조회수 = e?.totalViews ?? '-';
    this.댓글수 = e?.totalComments;
    this['부정 키워드 개수'] = e?.negativeTotal;
    this['부정 키워드'] = e?.negativeString;
    this.본문 = e?.content ?? '';
    this['원문 링크'] = e?.parsedData?.originalUrl;
  }
}

export class NaverViewResDTO {
  @ApiProperty({ type: NaverViewDTO })
  payload: NaverViewDTO;
}
