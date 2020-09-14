import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne} from 'typeorm';
import {IsString, IsNumber, MaxLength} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';
import {User} from '../user/user.entity';
import {Project} from '../project/project.entity';

@Entity()
export class Reference {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column('text')
  @IsString()
  @MaxLength(+process.env.REFERENCE_LIMIT)
  text: string;

  // ManyToOne
  @ApiProperty()
  @ManyToOne(type => User)
  createdBy: User;

  @ApiProperty({ type: () => Project })
  @ManyToOne(
      type => Project,
      project => project.references
  )
  project: Project;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
