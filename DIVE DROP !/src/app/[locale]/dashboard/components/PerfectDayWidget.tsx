'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { PerfectDayAnswers, DivePlan, ExperienceLevel, DiveGoal, GuidePreference } from '@/types/agent'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { AppIcon } from '@/components/AppIcon'

interface PerfectDayWidgetProps {
  userExperience?: ExperienceLevel
  locale: string
}

export default function PerfectDayWidget({ userExperience = 'beginner', locale }: PerfectDayWidgetProps) {
  const t = useTranslations()
  const [status, setStatus] = useState<'idle' | 'questions' | 'loading' | 'result' | 'error'>('idle')
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Partial<PerfectDayAnswers>>({
    experienceLevel: userExperience,
  })
  const [plan, setPlan] = useState<DivePlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleStart = () => {
    setStatus('questions')
    setCurrentQuestion(0)
    setError(null)
  }

  const handleAnswer = (value: string) => {
    const newAnswers = { ...answers }
    if (currentQuestion === 0) {
      newAnswers.experienceLevel = value as ExperienceLevel
    } else if (currentQuestion === 1) {
      newAnswers.goal = value as DiveGoal
    } else if (currentQuestion === 2) {
      newAnswers.guidePreference = value as GuidePreference
    }
    setAnswers(newAnswers)
  }

  const handleNext = async () => {
    if (currentQuestion < 2) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      // All questions answered - call API
      await submitAnswers()
    }
  }

  const submitAnswers = async () => {
    if (!answers.experienceLevel || !answers.goal || !answers.guidePreference) {
      setError('Please answer all questions')
      return
    }

    setStatus('loading')
    setError(null)

    try {
      const response = await fetch('/api/agent/perfect-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: answers as PerfectDayAnswers,
          locale,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate plan')
      }

      const data = await response.json()
      setPlan(data.plan)
      setStatus('result')
    } catch (err) {
      console.error('Perfect day error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setStatus('error')
    }
  }

  const handleSave = async () => {
    if (!plan) return
    setSaving(true)

    try {
      const response = await fetch('/api/dive-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dive_site_id: plan.siteId,
          instructor_id: plan.instructors[0]?.id || null,
          experience_level: answers.experienceLevel,
          goal: answers.goal,
          ai_message: plan.message,
          tips: plan.tips,
        }),
      })

      if (!response.ok) throw new Error('Failed to save plan')

      setStatus('idle')
      setCurrentQuestion(0)
      setAnswers({ experienceLevel: userExperience })
      setPlan(null)
    } catch (err) {
      console.error('Save error:', err)
      setError('Failed to save plan')
    } finally {
      setSaving(false)
    }
  }

  // Idle state
  if (status === 'idle') {
    return (
      <Card variant="elevated" className="mt-8 overflow-hidden">
        <div className="bg-gradient-to-br from-ocean-blue to-cyan-accent p-6 sm:p-8">
          <h2 className="text-h3 font-bold text-white mb-2">
            {t('perfectDay.title')}
          </h2>
          <p className="text-body text-white/90 mb-6">
            {t('perfectDay.subtitle')}
          </p>
          <Button variant="primary" size="lg" onClick={handleStart} className="w-full sm:w-auto">
            {t('common.start')}
          </Button>
        </div>
      </Card>
    )
  }

  // Questions state
  if (status === 'questions') {
    const questions = [
      {
        key: 'q1',
        options: [
          { value: 'beginner', label: 'opt_beginner' },
          { value: 'intermediate', label: 'opt_intermediate' },
          { value: 'advanced', label: 'opt_advanced' },
        ],
      },
      {
        key: 'q2',
        options: [
          { value: 'new_site', label: 'opt_new_site' },
          { value: 'improve_skills', label: 'opt_improve' },
          { value: 'social', label: 'opt_social' },
          { value: 'explore', label: 'opt_explore' },
        ],
      },
      {
        key: 'q3',
        options: [
          { value: 'yes', label: 'opt_guide_yes' },
          { value: 'no', label: 'opt_guide_no' },
          { value: 'surprise', label: 'opt_guide_surprise' },
        ],
      },
    ]

    const question = questions[currentQuestion]
    const answerKeys = ['experienceLevel', 'goal', 'guidePreference'] as const
    const currentAnswer = answers[answerKeys[currentQuestion]]

    return (
      <Card variant="elevated" className="mt-8">
        <div className="p-6 sm:p-8">
          {/* Step indicator */}
          <div className="flex gap-2 mb-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i <= currentQuestion ? 'bg-ocean-blue' : 'bg-border-light dark:bg-border-dark'
                }`}
              />
            ))}
          </div>

          {/* Question */}
          <h3 className="text-h4 font-bold mb-6 text-text-dark dark:text-text-light">
            {t(`perfectDay.${question.key}`)}
          </h3>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3 mb-8">
            {question.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(option.value)}
                className={`p-4 rounded-lg border-2 transition-all text-left font-medium h-touch ${
                  currentAnswer === option.value
                    ? 'border-ocean-blue bg-ocean-blue/10 text-ocean-blue dark:bg-ocean-blue/20'
                    : 'border-border-light dark:border-border-dark text-text-dark dark:text-text-light hover:border-ocean-blue'
                }`}
              >
                {t(`perfectDay.${option.label}`)}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 justify-between">
            <Button
              variant="secondary"
              onClick={() => (currentQuestion > 0 ? setCurrentQuestion(currentQuestion - 1) : setStatus('idle'))}
            >
              {currentQuestion === 0 ? t('common.cancel') : t('common.back')}
            </Button>
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!currentAnswer}
            >
              {currentQuestion === 2 ? t('common.submit') : t('common.next')}
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  // Loading state
  if (status === 'loading') {
    return (
      <Card variant="elevated" className="mt-8">
        <div className="p-6 sm:p-8 text-center">
          <div className="animate-pulse mb-4">
            <div className="h-24 bg-gradient-to-r from-ocean-blue/20 to-cyan-accent/20 rounded-lg" />
          </div>
          <p className="text-body text-text-secondary dark:text-text-secondary">
            {t('perfectDay.loading')}
          </p>
        </div>
      </Card>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <Card variant="elevated" className="mt-8 border border-error-400">
        <div className="p-6 sm:p-8">
          <h3 className="text-h4 font-bold text-error-600 mb-2">Error</h3>
          <p className="text-body text-text-secondary dark:text-text-secondary mb-4">
            {error || 'Something went wrong'}
          </p>
          <Button variant="secondary" onClick={() => setStatus('idle')}>
            {t('common.tryAgain')}
          </Button>
        </div>
      </Card>
    )
  }

  // Result state
  if (status === 'result' && plan) {
    return (
      <Card variant="elevated" className="mt-8">
        <div className="p-6 sm:p-8">
          {/* Site Card */}
          <div className="mb-8 p-4 rounded-lg bg-light-surface dark:bg-dark-surface border border-border-light dark:border-border-dark">
            <h3 className="text-caption font-semibold text-text-secondary dark:text-text-secondary mb-2 uppercase">
              {t('perfectDay.recommended_site')}
            </h3>
            <h2 className="text-h3 font-bold text-text-dark dark:text-text-light mb-2">
              {plan.siteName}
            </h2>
            <div className="flex gap-3 flex-wrap mb-3">
              <span className="inline-block px-3 py-1 rounded-full bg-cyan-accent/20 text-cyan-accent font-semibold text-sm">
                {plan.siteDepth}m
              </span>
              <span className="inline-block px-3 py-1 rounded-full bg-ocean-blue/20 text-ocean-blue font-semibold text-sm">
                {plan.siteDifficulty}
              </span>
            </div>
            <p className="flex items-center gap-2 text-body text-text-secondary dark:text-text-secondary">
              <AppIcon name="location" className="h-4 w-4" />{plan.siteLocation}
            </p>
          </div>

          {/* Message */}
          <div className="mb-8 p-4 rounded-lg bg-ocean-blue/5 dark:bg-ocean-blue/10 border border-ocean-blue/20">
            <p className="text-body text-text-dark dark:text-text-light italic">
              &quot;{plan.message}&quot;
            </p>
          </div>

          {/* Tips */}
          {plan.tips && plan.tips.length > 0 && (
            <div className="mb-8">
              <h3 className="text-h4 font-bold text-text-dark dark:text-text-light mb-3">
                Tips
              </h3>
              <ul className="space-y-2">
                {plan.tips.map((tip, i) => (
                  <li key={i} className="flex gap-3 text-body text-text-dark dark:text-text-light">
                    <span className="text-ocean-blue font-bold flex-shrink-0">✓</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructors */}
          {plan.instructors && plan.instructors.length > 0 && (
            <div className="mb-8 p-4 rounded-lg bg-light-surface dark:bg-dark-surface border border-border-light dark:border-border-dark">
              <h3 className="text-h4 font-bold text-text-dark dark:text-text-light mb-3">
                {t('perfectDay.your_instructors')}
              </h3>
              <div className="space-y-2">
                {plan.instructors.map((instructor) => (
                  <div key={instructor.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-ocean-blue/20 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-ocean-blue text-sm">
                        {(instructor.firstName[0] + instructor.lastName[0]).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-text-dark dark:text-text-light">
                        {instructor.firstName} {instructor.lastName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setStatus('idle')}
              className="flex-1"
            >
              {t('common.back')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              {saving ? t('common.saving') : t('perfectDay.save')}
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return null
}
