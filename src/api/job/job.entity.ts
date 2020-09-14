import {Entity, PrimaryGeneratedColumn, Column, IsNull, ManyToOne, CreateDateColumn, UpdateDateColumn} from 'typeorm';
import {ApiProperty} from '@nestjs/swagger';
import {IsString, IsNumber, IsDate} from 'class-validator';
import {User} from '../user/user.entity';
import {Project} from '../project/project.entity';

@Entity()
export class Job {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  @IsString()
  script: string;

  @ApiProperty()
  @Column({type: 'text', nullable: true})
  @IsString()
  result: string;

  @ApiProperty()
  @Column()
  @IsNumber()
  source: number;

  @ApiProperty()
  @Column()
  @IsNumber()
  status: number;

  @ApiProperty()
  @Column({type: 'varchar', nullable: true})
  @IsString()
  secretKey: string;

  @ApiProperty()
  @Column({type: 'varchar', nullable: true})
  @IsString()
  sourceEmail: string;

  // ManyToOne
  @ApiProperty()
  @ManyToOne(type => Project)
  project: Project;

  @ApiProperty()
  @ManyToOne(type => User)
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
