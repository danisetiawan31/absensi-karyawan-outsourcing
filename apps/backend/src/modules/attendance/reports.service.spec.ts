import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { AppModule } from '../../app.module';
import { INestApplication } from '@nestjs/common';
import { GetAttendanceReportQueryDto } from './dto/get-attendance-report-query.dto';

describe('ReportsService (generateAttendanceReport)', () => {
  let app: INestApplication;
  let service: AttendanceService;

  const periodeMulai = '2026-11-01';
  const periodeSelesai = '2026-11-05';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    service = app.get<AttendanceService>(AttendanceService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should generate valid XLSX report buffer, filename, and mimeType', async () => {
    const query: GetAttendanceReportQueryDto = {
      format: 'xlsx',
      periodeMulai,
      periodeSelesai,
    };

    const report = await service.generateAttendanceReport(query);

    expect(report).toBeDefined();
    expect(Buffer.isBuffer(report.buffer)).toBe(true);
    expect(report.buffer.length).toBeGreaterThan(0);
    expect(report.filename).toBe(
      `laporan-kehadiran_${periodeMulai}_${periodeSelesai}.xlsx`,
    );
    expect(report.mimeType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('should generate valid PDF report buffer, filename, and mimeType', async () => {
    const query: GetAttendanceReportQueryDto = {
      format: 'pdf',
      periodeMulai,
      periodeSelesai,
    };

    const report = await service.generateAttendanceReport(query);

    expect(report).toBeDefined();
    expect(Buffer.isBuffer(report.buffer)).toBe(true);
    expect(report.buffer.length).toBeGreaterThan(0);
    expect(report.filename).toBe(
      `laporan-kehadiran_${periodeMulai}_${periodeSelesai}.pdf`,
    );
    expect(report.mimeType).toBe('application/pdf');
  });

  it('should reuse getAttendanceSummary to fetch report data', async () => {
    const query: GetAttendanceReportQueryDto = {
      format: 'xlsx',
      periodeMulai,
      periodeSelesai,
    };

    const getSummarySpy = jest.spyOn(service, 'getAttendanceSummary');

    await service.generateAttendanceReport(query);

    expect(getSummarySpy).toHaveBeenCalledWith(query);
    getSummarySpy.mockRestore();
  });
});
