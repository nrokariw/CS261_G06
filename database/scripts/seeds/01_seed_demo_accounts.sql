-- ============================================================================
-- Seed Script: Demo Student Accounts (dev / demo mode only)
-- WARNING: Do not execute this script in production environments.
-- Default password for all demo accounts: password123
-- ============================================================================
MERGE INTO users AS target
USING (VALUES
    ('6809000001', N'6809000001', N'Ploy S.', N'ploy.s@dome.tu.ac.th', N'คณะวิทยาศาสตร์และเทคโนโลยี', N'สาขาวิชาวิทยาการคอมพิวเตอร์', '$2a$10$8CBUy4GX/pWHFVMbLSkBDuznKbgnpv0MT/hTh4.ZVqbiNbNRAnurK', 'STUDENT', 'LOCAL'),
    ('6809000002', N'6809000002', N'Boom N.', N'boom.n@dome.tu.ac.th', N'คณะวิทยาศาสตร์และเทคโนโลยี', N'สาขาวิชาวิทยาการคอมพิวเตอร์', '$2a$10$sa64svx2.Zd7Y2fSaEyGy.XLhfa2UQwkl0jGqI3abhyC50z4MMv4m', 'STUDENT', 'LOCAL'),
    ('6809000003', N'6809000003', N'Somchai K.', N'somchai.k@dome.tu.ac.th', N'คณะวิศวกรรมศาสตร์', N'สาขาวิชาวิศวกรรมคอมพิวเตอร์', '$2a$10$ijrQ88.66RgyMTrLZnsBL.J.VVJIeY00ZEnVGD2bDfMKGE5Dpakka', 'STUDENT', 'LOCAL')
) AS source (student_id, username, full_name, email, faculty, department, password_hash, role, auth_provider)
ON target.student_id = source.student_id
WHEN NOT MATCHED THEN
    INSERT (student_id, username, full_name, email, faculty, department, password_hash, role, auth_provider)
    VALUES (source.student_id, source.username, source.full_name, source.email, source.faculty, source.department, source.password_hash, source.role, source.auth_provider);
GO
