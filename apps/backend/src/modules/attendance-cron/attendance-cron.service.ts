import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TipeNotifikasi, Prisma } from '@prisma/client';
import { UNFILLED_SHIFT_THRESHOLD_MS } from '../../common/constants/attendance.constant';

type JadwalWithRelations = Prisma.JadwalShiftGetPayload<{
  include: {
    site: {
      include: {
        supervisorSite: true;
      };
    };
    karyawan: true;
    notifikasi: true;
  };
}>;

@Injectable()
export class AttendanceCronService {
  private readonly logger = new Logger(AttendanceCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const now = new Date();
    await this.checkAndSendReminders(now);
    await this.checkAndSendSupervisorAlerts(now);
    await this.checkAndMarkAbsent(now);
  }

  async checkAndSendReminders(now: Date) {
    this.logger.debug('Running T+5 check-in reminder check...');

    const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const jadwals = (await this.prisma.jadwalShift.findMany({
      where: {
        jamMulai: { lte: fiveMinsAgo },
        jamSelesai: { gt: now },
        OR: [{ logKehadiran: null }, { logKehadiran: { waktuCheckIn: null } }],
        notifikasi: {
          none: {
            tipe: TipeNotifikasi.REMINDER_CHECKIN,
          },
        },
      },
      include: {
        site: true,
      },
    })) as Prisma.JadwalShiftGetPayload<{ include: { site: true } }>[];

    for (const jadwal of jadwals) {
      await this.notificationsService.create(
        jadwal.karyawanId,
        jadwal.id,
        TipeNotifikasi.REMINDER_CHECKIN,
        `Anda belum melakukan check-in untuk shift di ${jadwal.site.nama}.`,
      );
      this.logger.log(
        `Sent REMINDER_CHECKIN to User ${jadwal.karyawanId} for Jadwal ${jadwal.id}`,
      );
    }
  }

  async checkAndSendSupervisorAlerts(now: Date) {
    this.logger.debug('Running T+15 supervisor alert check...');

    const fifteenMinsAgo = new Date(
      now.getTime() - UNFILLED_SHIFT_THRESHOLD_MS,
    );

    const jadwals = (await this.prisma.jadwalShift.findMany({
      where: {
        jamMulai: { lte: fifteenMinsAgo },
        jamSelesai: { gt: now },
        OR: [{ logKehadiran: null }, { logKehadiran: { waktuCheckIn: null } }],
      },
      include: {
        site: {
          include: {
            supervisorSite: true,
          },
        },
        karyawan: true,
        notifikasi: {
          where: {
            tipe: TipeNotifikasi.ALERT_SUPERVISOR,
          },
        },
      },
    })) as JadwalWithRelations[];

    for (const jadwal of jadwals) {
      const supervisors = jadwal.site.supervisorSite;
      if (supervisors.length === 0) {
        continue;
      }

      const notifiedSupervisorIds = new Set<string>();
      for (const notif of jadwal.notifikasi as { userId: string }[]) {
        notifiedSupervisorIds.add(notif.userId);
      }

      for (const supervisor of supervisors) {
        if (!notifiedSupervisorIds.has(supervisor.supervisorId)) {
          await this.notificationsService.create(
            supervisor.supervisorId,
            jadwal.id,
            TipeNotifikasi.ALERT_SUPERVISOR,
            `Karyawan ${jadwal.karyawan.nama} belum check-in untuk shift di ${jadwal.site.nama} (lewat 15 menit).`,
          );
          this.logger.log(
            `Sent ALERT_SUPERVISOR to Supervisor ${supervisor.supervisorId} for Jadwal ${jadwal.id}`,
          );
        }
      }
    }
  }

  async checkAndMarkAbsent(now: Date) {
    this.logger.debug('Running auto-mark TIDAK_HADIR check...');

    const jadwals = await this.prisma.jadwalShift.findMany({
      where: {
        jamSelesai: { lte: now },
        OR: [
          { logKehadiran: null },
          {
            logKehadiran: {
              waktuCheckIn: null,
              hasilVerifikasiCheckIn: null,
            },
          },
        ],
      },
      include: {
        logKehadiran: true,
      },
    });

    for (const jadwal of jadwals) {
      if (!jadwal.logKehadiran) {
        try {
          await this.prisma.logKehadiran.create({
            data: {
              jadwalId: jadwal.id,
              karyawanId: jadwal.karyawanId,
              hasilVerifikasiCheckIn: 'TIDAK_HADIR',
            },
          });
          this.logger.log(
            `Auto-marked TIDAK_HADIR (created new log) for Jadwal ${jadwal.id}`,
          );
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            this.logger.debug(
              `Race condition skipped: LogKehadiran already created for Jadwal ${jadwal.id}`,
            );
            continue;
          }
          throw error;
        }
      } else {
        const result = await this.prisma.logKehadiran.updateMany({
          where: {
            jadwalId: jadwal.id,
            waktuCheckIn: null,
          },
          data: {
            hasilVerifikasiCheckIn: 'TIDAK_HADIR',
          },
        });

        if (result.count > 0) {
          this.logger.log(
            `Auto-marked TIDAK_HADIR (updated existing log) for Jadwal ${jadwal.id}`,
          );
        } else {
          this.logger.debug(
            `Race condition skipped: Check-in occurred before update for Jadwal ${jadwal.id}`,
          );
        }
      }
    }
  }
}
