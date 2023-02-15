import { TeamsService } from './../teams/teams.service';
import { MatchingRefuseReasonsRepository } from './repositories/matching-refuse-reasons.repository';
import { CreateMatchingRefuseReasonDto } from './dtos/create-matching-refuse-reason.dto';
import { TicketsService } from 'src/tickets/tickets.service';
import { BadRequestException } from '@nestjs/common/exceptions';
import { MatchingsRepository } from './repositories/matchings.repository';
import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Matching } from './entities/matching.entity';
import { GetMatchingDto } from './dtos/get-matching.dto';
import { UsersService } from 'src/users/users.service';
import { MatchingStatus } from './interfaces/matching-status.enum';
import { AdminGetMatchingDto } from 'src/admin/dtos/admin-get-matching.dto';

@Injectable()
export class MatchingsService {
  constructor(
    private matchingsRepository: MatchingsRepository,
    private matchingRefuseReasonsRepository: MatchingRefuseReasonsRepository,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    @Inject(forwardRef(() => TicketsService))
    private ticketsService: TicketsService,
    @Inject(forwardRef(() => TeamsService))
    private teamsService: TeamsService,
  ) {}

  async getMatchingByTeamId(teamId: number): Promise<Matching> {
    return this.matchingsRepository.getMatchingByTeamId(teamId);
  }

  async getMatchingIdByTeamId(teamId: number): Promise<{ matchingId: number }> {
    return this.matchingsRepository.getMatchingIdByTeamId(teamId);
  }

  async getMatchingById(matchingId: number): Promise<Matching> {
    return this.matchingsRepository.getMatchingById(matchingId);
  }

  async getMatchingInfoById(userId: number, matchingId: number): Promise<GetMatchingDto> {
    const matching = await this.getMatchingById(matchingId);

    if (!matching || !!matching.deletedAt) {
      throw new NotFoundException(`Can't find matching with id ${matchingId}`);
    }

    const { teamId } = await this.usersService.getTeamIdByUserId(userId);

    const ourteamGender =
      matching.maleTeam.id === teamId ? 'male' : matching.femaleTeam.id === teamId ? 'female' : null;

    if (!ourteamGender) {
      throw new NotFoundException(`Can't find matching with id ${matchingId}`);
    }

    const result = {
      ourteamId: ourteamGender === 'male' ? matching.maleTeam.id : matching.femaleTeam.id,
      partnerTeamId: ourteamGender === 'male' ? matching.femaleTeam.id : matching.maleTeam.id,
      ourteamIsAccepted: ourteamGender === 'male' ? matching.maleTeamIsAccepted : matching.femaleTeamIsAccepted,
      partnerTeamIsAccepted: ourteamGender === 'male' ? matching.femaleTeamIsAccepted : matching.maleTeamIsAccepted,
      chatCreatedAt: matching.chatCreatedAt,
      createdAt: matching.createdAt,
      updatedAt: matching.updatedAt,
      deletedAt: matching.deletedAt,
    };

    return result;
  }

  async acceptMatchingByTeamId(userId: number, matchingId: number, teamId: number): Promise<void> {
    const matching = await this.getMatchingById(matchingId);

    // 해당 매칭 정보가 없는 경우
    if (!matching || !!matching.deletedAt) {
      throw new NotFoundException(`Can't find matching with id ${matchingId}`);
    }

    const gender = matching.maleTeam.id === teamId ? 'male' : 'female';

    if (gender === 'male') {
      // 이미 수락 또는 거절한 경우
      if (matching.maleTeamIsAccepted === true || matching.maleTeamIsAccepted === false) {
        throw new BadRequestException(`already responded team`);
      }
      // 상대팀이 이미 거절한 경우
      if (matching.femaleTeamIsAccepted === false) {
        throw new BadRequestException(`partner team already refused`);
      }
    }

    if (gender === 'female') {
      // 이미 수락 또는 거절한 경우
      if (matching.femaleTeamIsAccepted === true || matching.femaleTeamIsAccepted === false) {
        throw new BadRequestException(`already responded team`);
      }
      // 상대팀이 이미 거절한 경우
      if (matching.maleTeamIsAccepted === false) {
        throw new BadRequestException(`partner team already refused`);
      }
    }

    const ticket = await this.ticketsService.getTicketByUserId(userId);

    // 이용권이 없는 경우
    if (!ticket) {
      throw new BadRequestException(`user doesn't have a ticket`);
    }

    // 이용권 사용 처리
    await this.ticketsService.useTicketById(ticket.id);

    return this.matchingsRepository.acceptMatchingByGender(matchingId, gender, ticket);
  }

  async refuseMatchingByTeamId(matchingId: number, teamId: number): Promise<void> {
    const matching = await this.getMatchingById(matchingId);

    // 해당 매칭 정보가 없는 경우
    if (!matching || !!matching.deletedAt) {
      throw new NotFoundException(`Can't find matching with id ${matchingId}`);
    }

    const gender = matching.maleTeam.id === teamId ? 'male' : 'female';

    // 이미 수락 또는 거절한 경우
    if (gender === 'male' && (matching.maleTeamIsAccepted === true || matching.maleTeamIsAccepted === false)) {
      throw new BadRequestException(`already responded team`);
    }
    if (gender === 'female' && (matching.femaleTeamIsAccepted === true || matching.femaleTeamIsAccepted === false)) {
      throw new BadRequestException(`already responded team`);
    }

    if (gender === 'male') {
      // 상대팀이 이미 수락한 경우, 상대팀 이용권 환불
      if (matching.femaleTeamIsAccepted === true) {
        await this.ticketsService.refundTicketById(matching.femaleTeamTicket.id);
        await this.matchingsRepository.deleteTicketInfoByGender(matchingId, 'female');
      }
    }

    if (gender === 'female') {
      // 상대팀이 이미 수락한 경우, 상대팀 이용권 환불
      if (matching.maleTeamIsAccepted === true) {
        await this.ticketsService.refundTicketById(matching.maleTeamTicket.id);
        await this.matchingsRepository.deleteTicketInfoByGender(matchingId, 'male');
      }
    }

    return this.matchingsRepository.refuseMatchingByGender(matchingId, gender);
  }

  async createMatchingRefuseReason(
    matchingId: number,
    teamId: number,
    createMatchingRefuseReasonDto: CreateMatchingRefuseReasonDto,
  ): Promise<void> {
    const matching = await this.getMatchingById(matchingId);

    if (!matching || !!matching.deletedAt) {
      throw new NotFoundException(`Can't find matching with id ${matchingId}`);
    }

    const team = await this.teamsService.getTeamById(teamId);

    if (!team || !!team.deletedAt) {
      throw new NotFoundException(`Can't find team with id ${teamId}`);
    }

    return this.matchingRefuseReasonsRepository.createMatchingRefuseReason(
      matching,
      team,
      createMatchingRefuseReasonDto,
    );
  }

  async deleteMatchingById(matchingId: number): Promise<void> {
    const matching = await this.getMatchingById(matchingId);

    // 해당 매칭 정보가 없는 경우
    if (!matching || !!matching.deletedAt) {
      throw new NotFoundException(`Can't find matching with id ${matchingId}`);
    }

    // 매칭 soft delete
    await this.matchingsRepository.deleteMatchingById(matchingId);

    // 관련 데이터 soft delete
    const maleTeamId = matching?.maleTeam?.id;
    const maleTeamIsDeleted = matching?.maleTeam?.deletedAt;
    const femaleTeamId = matching?.femaleTeam?.id;
    const femaleTeamIsDeleted = matching?.femaleTeam?.deletedAt;
    const maleTeamTicketId = matching?.maleTeamTicket?.id;
    const femaleTeamTicketId = matching?.femaleTeamTicket?.id;

    if (!!maleTeamId && !maleTeamIsDeleted) {
      await this.teamsService.deleteTeamById(maleTeamId);
    }

    if (!!femaleTeamId && !femaleTeamIsDeleted) {
      await this.teamsService.deleteTeamById(femaleTeamId);
    }

    if (!!maleTeamTicketId) {
      await this.ticketsService.deleteTicketById(maleTeamTicketId);
    }

    if (!!femaleTeamTicketId) {
      await this.ticketsService.deleteTicketById(femaleTeamTicketId);
    }
  }

  async getMatchingsByStatus(status: MatchingStatus): Promise<{ matchings: AdminGetMatchingDto[] }> {
    // 수락/거절 대기자 조회
    if (status === MatchingStatus.SUCCEEDED) {
      return this.matchingsRepository.getSucceededMatchings();
    }
  }

  async saveChatCreatedAtByMatchingId(matchingId: number): Promise<void> {
    const matching = await this.getMatchingById(matchingId);

    if (!matching || !!matching.deletedAt) {
      throw new NotFoundException(`Can't find matching with id ${matchingId}`);
    }

    return this.matchingsRepository.updateChatCreatedAtByMatchingId(matchingId);
  }

  // 매칭 실행
  async doMatching(): Promise<void> {
    // 1. 현재 라운드의 인원 가져오기 (블랙리스트 제외, 매칭 3회 미만)
    // 2. 남/녀 팀으로 구분
    // 3. 대학 레벨 매칭 (동일대학 거부 여부 확인, 가장 높은 대학 기준)
    // 4. 선호 지역 매칭
    // 5. 날짜 매칭
    // 6. 주량 레벨 매칭 (절대값 차이가 4 미만이도록)
    // 7. 나이 매칭 (본인 선호 나이에 상대방 나이 매칭)
  }
}
