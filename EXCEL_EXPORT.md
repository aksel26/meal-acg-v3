# 매핑

1. Raw data 시트
K열 - 비고 

2. 사용 가이드
직급(B열) 순 내림차순
D열 - 팀에 속한 팀원 수
E열 - '/budget' 페이지 테이블 활동비 기준 열 내용 
H열 삭제

3. 통계
수식 적용
D : `=VLOOKUP($C3,'사용 가이드'!$C$14:$G$52,4,0)`
E : `=VLOOKUP($C3,'사용 가이드'!$C$14:$G$52,5,0)`
F : D3-H3
G : E3-I3
H : `=SUM(J3:O3)`
I : `=SUM(P3:U3)`
J : `=SUMIFS('Raw data'!$I:$I, 'Raw data'!$B:$B,통계!$C3, 'Raw data'!$D:$D, 통계!J$2, 'Raw data'!$G:$G,통계!$H$2)`
K : `=SUMIFS('Raw data'!$I:$I, 'Raw data'!$B:$B,통계!$C3, 'Raw data'!$D:$D, 통계!K$2, 'Raw data'!$G:$G,통계!$H$2)`
L : `=SUMIFS('Raw data'!$I:$I, 'Raw data'!$B:$B,통계!$C3, 'Raw data'!$D:$D, 통계!L$2, 'Raw data'!$G:$G,통계!$H$2)`
M : `=SUMIFS('Raw data'!$I:$I, 'Raw data'!$B:$B,통계!$C3, 'Raw data'!$D:$D, 통계!M$2, 'Raw data'!$G:$G,통계!$H$2)`
O : `=SUMIFS('Raw data'!$I:$I, 'Raw data'!$B:$B,통계!$C3, 'Raw data'!$D:$D, 통계!O$2, 'Raw data'!$G:$G,통계!$H$2)`
P : `=SUMIFS('Raw data'!$I:$I, 'Raw data'!$B:$B,통계!$C3, 'Raw data'!$D:$D, 통계!P$2, 'Raw data'!$G:$G,통계!$H$2)`
Q : `=SUMIFS('Raw data'!$I:$I, 'Raw data'!$B:$B,통계!$C3, 'Raw data'!$D:$D, 통계!Q$2, 'Raw data'!$G:$G,통계!$H$2)`
R : `=SUMIFS('Raw data'!$I:$I, 'Raw data'!$B:$B,통계!$C3, 'Raw data'!$D:$D, 통계!R$2, 'Raw data'!$G:$G,통계!$H$2)`
S : `=SUMIFS('Raw data'!$I:$I, 'Raw data'!$B:$B,통계!$C3, 'Raw data'!$D:$D, 통계!S$2, 'Raw data'!$G:$G,통계!$H$2)`
T : `=SUMIFS('Raw data'!$I:$I, 'Raw data'!$B:$B,통계!$C3, 'Raw data'!$D:$D, 통계!T$2, 'Raw data'!$G:$G,통계!$H$2)`
U : `=SUMIFS('Raw data'!$I:$I, 'Raw data'!$B:$B,통계!$C3, 'Raw data'!$D:$D, 통계!U$2, 'Raw data'!$G:$G,통계!$H$2)`
V : `=SUMIFS('Raw data'!$I:$I, 'Raw data'!$B:$B,통계!$C3, 'Raw data'!$D:$D, 통계!V$2, 'Raw data'!$G:$G,통계!$H$2)`


