import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LessonPlayer from '@/components/lesson/LessonPlayer';
import { LESSONS, getLesson } from '@/lib/lesson/registry';

export function generateStaticParams() {
  return LESSONS.map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).id);
  return lesson ? { title: `${lesson.title} · Learning Clubs`, description: lesson.summary } : {};
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const lesson = getLesson((await params).id);
  if (!lesson) notFound();
  return <LessonPlayer lesson={lesson} />;
}
