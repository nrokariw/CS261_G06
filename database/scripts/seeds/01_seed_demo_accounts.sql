-- ============================================================================
-- Seed Script: Demo Student Accounts (dev / demo mode)
-- Default password for all demo accounts: password123
-- ============================================================================
:setvar DB_NAME our_project_db
USE [$(DB_NAME)];
GO

MERGE INTO users AS target
USING (VALUES
    ('6809000001', N'6809000001', N'Ploy S.', N'ploy.s@dome.tu.ac.th', N'คณะวิทยาศาสตร์และเทคโนโลยี', N'สาขาวิชาวิทยาการคอมพิวเตอร์', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'STUDENT', 'LOCAL'),
    ('6809000002', N'6809000002', N'Boom N.', N'boom.n@dome.tu.ac.th', N'คณะวิทยาศาสตร์และเทคโนโลยี', N'สาขาวิชาวิทยาการคอมพิวเตอร์', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'STUDENT', 'LOCAL'),
    ('6809000003', N'6809000003', N'Somchai K.', N'somchai.k@dome.tu.ac.th', N'คณะวิศวกรรมศาสตร์', N'สาขาวิชาวิศวกรรมคอมพิวเตอร์', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'STUDENT', 'LOCAL')
) AS source (student_id, username, full_name, email, faculty, department, password_hash, role, auth_provider)
ON target.student_id = source.student_id
WHEN NOT MATCHED THEN
    INSERT (student_id, username, full_name, email, faculty, department, password_hash, role, auth_provider)
    VALUES (source.student_id, source.username, source.full_name, source.email, source.faculty, source.department, source.password_hash, source.role, source.auth_provider);
GO
