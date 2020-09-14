import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne} from 'typeorm';
import {IsString, MaxLength} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';
import {Controller} from '@nestjs/common';
import {User} from '../user/user.entity';

@Entity()
export class Company {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  @IsString()
  @MaxLength(50)
  name: string;

  // ManyToOne
  @ApiProperty({ type: () => User })
  @ManyToOne(type => User)
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
