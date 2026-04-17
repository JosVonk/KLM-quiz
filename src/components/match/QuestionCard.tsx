'use client'

import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import type { Question } from '@/types'

interface Props {
  question: Question
  selectedAnswer: string | null
  onAnswer: (answer: string) => void
  disabled: boolean
}

export function QuestionCard({ question, selectedAnswer, onAnswer, disabled }: Props) {
  return (
    <Card className="space-y-4">
      {question.media_url && (
        <div className="relative w-full h-48 rounded-lg overflow-hidden">
          <Image src={question.media_url} alt="Question media" fill className="object-cover" />
        </div>
      )}
      <p className="text-lg font-semibold text-klm-dark">{question.question_en}</p>
      <div className="grid grid-cols-1 gap-2">
        {question.options.map((option, i) => (
          <button
            key={i}
            disabled={disabled}
            onClick={() => onAnswer(option)}
            className={`text-left px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all
              ${selectedAnswer === option
                ? 'border-klm-blue bg-klm-blue text-white'
                : 'border-gray-200 hover:border-klm-blue hover:bg-klm-light'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {option}
          </button>
        ))}
      </div>
    </Card>
  )
}
