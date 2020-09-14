import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne} from 'typeorm';
import {IsString, MaxLength, IsNumber} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';
import {Project} from '../project/project.entity';
import {User} from '../user/user.entity';

@Entity()
export class Disclaimer {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column('text')
  @IsString()
  @MaxLength(+process.env.DISCLAIMER_LIMIT)
  text: string;

  @ApiProperty({ type: () => Project })
  @ManyToOne(
      type => Project,
      project => project.disclaimers
  )
  project: Project;

  @ApiProperty()
  @ManyToOne(type => User)
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
