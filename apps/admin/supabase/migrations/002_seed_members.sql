-- Seed 35 members
-- Admin accounts: 홍세영, 윤이나
-- Default password: password123 (should be changed after first login)

INSERT INTO members (login_id, password, full_name, role) VALUES
('권동균', 'password123', '권동균', 'user'),
('김낙균', 'password123', '김낙균', 'user'),
('김다은', 'password123', '김다은', 'user'),
('김다희', 'password123', '김다희', 'user'),
('김단아', 'password123', '김단아', 'user'),
('김대희', 'password123', '김대희', 'user'),
('김도윤', 'password123', '김도윤', 'user'),
('김동건', 'password123', '김동건', 'user'),
('김선경', 'password123', '김선경', 'user'),
('김소윤', 'password123', '김소윤', 'user'),
('김영만', 'password123', '김영만', 'user'),
('김윤경', 'password123', '김윤경', 'user'),
('김현민', 'password123', '김현민', 'user'),
('김현해', 'password123', '김현해', 'user'),
('박세령', 'password123', '박세령', 'user'),
('신효은', 'password123', '신효은', 'user'),
('안나연', 'password123', '안나연', 'user'),
('안정훈', 'password123', '안정훈', 'user'),
('양우연', 'password123', '양우연', 'user'),
('윤이나', 'password123', '윤이나', 'admin'),
('윤지현', 'password123', '윤지현', 'user'),
('이다빈', 'password123', '이다빈', 'user'),
('이다애', 'password123', '이다애', 'user'),
('이서현', 'password123', '이서현', 'user'),
('이솔빈', 'password123', '이솔빈', 'user'),
('이승현', 'password123', '이승현', 'user'),
('이예린', 'password123', '이예린', 'user'),
('이채령', 'password123', '이채령', 'user'),
('장문경', 'password123', '장문경', 'user'),
('전승환', 'password123', '전승환', 'user'),
('한미희', 'password123', '한미희', 'user'),
('홍경희', 'password123', '홍경희', 'user'),
('홍세영', 'password123', '홍세영', 'admin'),
('홍찬미', 'password123', '홍찬미', 'user'),
('황희은', 'password123', '황희은', 'user')
ON CONFLICT (login_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;
