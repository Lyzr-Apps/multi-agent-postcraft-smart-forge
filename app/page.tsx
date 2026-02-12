'use client'

import { useState, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import {
  getScheduleStatus,
  pauseSchedule,
  resumeSchedule,
  getRunHistory,
  cronToHuman
} from '@/lib/scheduler'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import {
  FiTrendingUp,
  FiEdit3,
  FiImage,
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiPlay,
  FiPause,
  FiCalendar,
  FiArrowLeft,
  FiRefreshCw,
  FiDownload,
  FiBarChart2,
  FiAlertCircle,
  FiTarget,
  FiZap,
  FiFileText,
  FiSearch,
  FiSettings,
  FiLoader
} from 'react-icons/fi'

// Agent IDs
const CONTENT_ORCHESTRATOR_ID = '698e1f65a96cf8dd37d6a841'
const VISUAL_INTELLIGENCE_ID = '698e1f31a96cf8dd37d6a840'
const LLM_JUDGE_ID = '698e1f49d53462d090523311'

// Schedule configuration
const SCHEDULE_ID = '698e1f6bebe6fd87d1dcc1d7'
const SCHEDULE_CRON = '0 9 * * *'
const SCHEDULE_TIMEZONE = 'America/New_York'

// TypeScript interfaces based on response schemas
interface ContentPackage {
  post_text: string
  hashtags: string[]
  engagement_elements: string[]
  source_references: string[]
}

interface OrchestratorResult {
  input_type?: string
  workflow_summary?: string
  research_insights?: string
  final_post?: string
  validation_status?: string
  humanization_improvements?: string
  content_package?: ContentPackage
  orchestrator_notes?: string
}

interface CarouselConcept {
  slide_number: number
  slide_content: string
  visual_description: string
}

interface VisualResult {
  single_image_concept?: string
  carousel_concepts?: CarouselConcept[]
  infographic_concept?: string
  dall_e_prompt?: string
  color_palette?: string[]
  visual_style?: string
  engagement_rationale?: string
}

interface JudgeResult {
  clarity_score?: number
  originality_score?: number
  authority_score?: number
  authenticity_score?: number
  engagement_potential_score?: number
  factual_integrity?: string
  overall_average?: number
  publication_ready?: boolean
  improvement_notes?: string[]
  strengths?: string[]
  weaknesses?: string[]
  judge_recommendation?: string
}

interface GeneratedContent {
  orchestratorData: OrchestratorResult
  visualData: VisualResult | null
  visualImages: string[]
  judgeData: JudgeResult | null
  timestamp: string
}

interface ScheduleStatus {
  is_active?: boolean
  next_run?: string
  cron_expression?: string
  timezone?: string
}

interface RunHistoryItem {
  run_id: string
  status: string
  started_at: string
  completed_at?: string
  error_message?: string
}

// Markdown renderer
function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part)
}

// Progress Step Component
function ProgressStep({
  label,
  isActive,
  isComplete
}: {
  label: string
  isActive: boolean
  isComplete: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      {isComplete ? (
        <FiCheckCircle className="text-green-500 flex-shrink-0" />
      ) : isActive ? (
        <FiLoader className="text-blue-500 animate-spin flex-shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-muted flex-shrink-0" />
      )}
      <span className={`text-sm ${isActive ? 'text-foreground font-medium' : isComplete ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  )
}

// Helper Components
function ScoreBar({ label, score }: { label: string; score: number }) {
  const percentage = (score / 10) * 100
  const color = score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium">{score}/10</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function AgentStatus({ name, isActive }: { name: string; isActive: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
      <span className={isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}>{name}</span>
    </div>
  )
}

export default function Home() {
  // Screen state
  const [screen, setScreen] = useState<'dashboard' | 'input' | 'output' | 'schedule'>('dashboard')
  const [useSampleData, setUseSampleData] = useState(false)

  // Form state
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('')
  const [audience, setAudience] = useState('')
  const [length, setLength] = useState('')
  const [ctaPreference, setCtaPreference] = useState('')

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(0)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Content state
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [contentHistory, setContentHistory] = useState<GeneratedContent[]>([])
  const [editedPost, setEditedPost] = useState('')

  // Visual generation state
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false)

  // Judge evaluation state
  const [isEvaluating, setIsEvaluating] = useState(false)

  // Schedule state
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus | null>(null)
  const [runHistory, setRunHistory] = useState<RunHistoryItem[]>([])
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false)

  // Load schedule status
  useEffect(() => {
    loadScheduleStatus()
    loadRunHistory()
  }, [])

  // Sample data effect
  useEffect(() => {
    if (useSampleData) {
      setTopic('The future of AI in content marketing and how it will transform LinkedIn engagement strategies')
      setTone('Professional yet conversational, authoritative but approachable')
      setAudience('Marketing professionals, content creators, and business leaders')
      setLength('Medium (200-300 words)')
      setCtaPreference('Question to spark discussion')

      // Add sample content history
      if (contentHistory.length === 0) {
        const sampleHistory: GeneratedContent[] = [
          {
            orchestratorData: {
              input_type: 'topic',
              final_post: 'AI is not replacing content marketers.\n\nIt is replacing content marketers who refuse to adapt.\n\nHere is what I learned after creating 500+ LinkedIn posts with AI assistance:\n\n1. AI handles research - I focus on insights\n2. AI drafts structure - I add personality\n3. AI suggests hooks - I choose what resonates\n\nThe best content comes from human creativity amplified by AI efficiency.\n\nWhat is your experience with AI in content creation?',
              content_package: {
                post_text: 'AI is not replacing content marketers...',
                hashtags: ['#ContentMarketing', '#AIContent', '#LinkedInStrategy'],
                engagement_elements: ['Hook question', 'Numbered list', 'Discussion CTA'],
                source_references: ['LinkedIn Engagement Report 2024', 'Content Marketing Institute']
              },
              workflow_summary: 'Researched latest AI content trends, validated claims, humanized output',
              validation_status: 'Approved'
            },
            visualData: null,
            visualImages: [],
            judgeData: {
              clarity_score: 9,
              originality_score: 8,
              authority_score: 8,
              authenticity_score: 9,
              engagement_potential_score: 9,
              factual_integrity: 'Pass',
              overall_average: 8.6,
              publication_ready: true,
              strengths: ['Clear value proposition', 'Authentic voice', 'Strong CTA'],
              improvement_notes: []
            },
            timestamp: new Date(Date.now() - 86400000).toISOString()
          },
          {
            orchestratorData: {
              input_type: 'topic',
              final_post: 'Spent 10 years building my personal brand the hard way.\n\nHere are 5 lessons I wish I knew earlier:\n\n→ Consistency beats perfection\n→ Vulnerability builds trust\n→ Value first, promotion second\n→ Engagement is a two-way street\n→ Your network is your net worth\n\nThe algorithm rewards authentic connection.\n\nWhich lesson resonates most with you?',
              content_package: {
                post_text: 'Spent 10 years building my personal brand...',
                hashtags: ['#PersonalBranding', '#LinkedInTips', '#ProfessionalGrowth'],
                engagement_elements: ['Story hook', 'Arrow bullets', 'Reflection question'],
                source_references: ['Personal experience', 'LinkedIn algorithm insights']
              },
              workflow_summary: 'Personal narrative approach, validated best practices',
              validation_status: 'Approved'
            },
            visualData: null,
            visualImages: [],
            judgeData: {
              clarity_score: 9,
              originality_score: 7,
              authority_score: 8,
              authenticity_score: 10,
              engagement_potential_score: 9,
              factual_integrity: 'Pass',
              overall_average: 8.6,
              publication_ready: true,
              strengths: ['Authentic personal story', 'Actionable insights'],
              improvement_notes: []
            },
            timestamp: new Date(Date.now() - 172800000).toISOString()
          }
        ]
        setContentHistory(sampleHistory)
      }
    } else {
      setTopic('')
      setTone('')
      setAudience('')
      setLength('')
      setCtaPreference('')
      setContentHistory([])
    }
  }, [useSampleData])

  async function loadScheduleStatus() {
    try {
      setIsLoadingSchedule(true)
      const status = await getScheduleStatus(SCHEDULE_ID)
      setScheduleStatus(status)
    } catch (err) {
      console.error('Failed to load schedule status:', err)
    } finally {
      setIsLoadingSchedule(false)
    }
  }

  async function loadRunHistory() {
    try {
      const history = await getRunHistory(SCHEDULE_ID, 10)
      setRunHistory(Array.isArray(history) ? history : [])
    } catch (err) {
      console.error('Failed to load run history:', err)
    }
  }

  async function toggleSchedule() {
    try {
      setIsLoadingSchedule(true)
      if (scheduleStatus?.is_active) {
        await pauseSchedule(SCHEDULE_ID)
      } else {
        await resumeSchedule(SCHEDULE_ID)
      }
      await loadScheduleStatus()
    } catch (err) {
      setError('Failed to update schedule status')
    } finally {
      setIsLoadingSchedule(false)
    }
  }

  async function handleGenerateContent() {
    if (!topic.trim()) {
      setError('Please enter a topic or idea')
      return
    }

    setIsGenerating(true)
    setGenerationStep(0)
    setError(null)
    setActiveAgentId(CONTENT_ORCHESTRATOR_ID)

    const userInput = `Topic: ${topic}\nTone: ${tone || 'Professional'}\nAudience: ${audience || 'General LinkedIn audience'}\nLength: ${length || 'Medium'}\nCTA Preference: ${ctaPreference || 'Question'}`

    try {
      // Step 1-4: Content Orchestrator (manages all sub-agents)
      setGenerationStep(1)
      const orchestratorResult = await callAIAgent(userInput, CONTENT_ORCHESTRATOR_ID)

      if (!orchestratorResult.success) {
        throw new Error('Content generation failed')
      }

      const orchestratorData = orchestratorResult.response?.result as OrchestratorResult

      setGenerationStep(5)

      const newContent: GeneratedContent = {
        orchestratorData,
        visualData: null,
        visualImages: [],
        judgeData: null,
        timestamp: new Date().toISOString()
      }

      setGeneratedContent(newContent)
      setEditedPost(orchestratorData?.final_post ?? orchestratorData?.content_package?.post_text ?? '')
      setContentHistory(prev => [newContent, ...prev])
      setScreen('output')

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content')
    } finally {
      setIsGenerating(false)
      setActiveAgentId(null)
    }
  }

  async function handleGenerateVisual() {
    if (!generatedContent) return

    setIsGeneratingVisual(true)
    setActiveAgentId(VISUAL_INTELLIGENCE_ID)
    setError(null)

    try {
      const postText = editedPost || generatedContent.orchestratorData?.final_post || ''
      const visualResult = await callAIAgent(postText, VISUAL_INTELLIGENCE_ID)

      if (!visualResult.success) {
        throw new Error('Visual generation failed')
      }

      const visualData = visualResult.response?.result as VisualResult
      const images = Array.isArray(visualResult.module_outputs?.artifact_files)
        ? visualResult.module_outputs.artifact_files.map((f: any) => f?.file_url).filter(Boolean)
        : []

      setGeneratedContent(prev => prev ? {
        ...prev,
        visualData,
        visualImages: images
      } : null)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate visual')
    } finally {
      setIsGeneratingVisual(false)
      setActiveAgentId(null)
    }
  }

  async function handleRunEvaluation() {
    if (!generatedContent) return

    setIsEvaluating(true)
    setActiveAgentId(LLM_JUDGE_ID)
    setError(null)

    try {
      const postText = editedPost || generatedContent.orchestratorData?.final_post || ''
      const judgeResult = await callAIAgent(postText, LLM_JUDGE_ID)

      if (!judgeResult.success) {
        throw new Error('Evaluation failed')
      }

      const judgeData = judgeResult.response?.result as JudgeResult

      setGeneratedContent(prev => prev ? {
        ...prev,
        judgeData
      } : null)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate content')
    } finally {
      setIsEvaluating(false)
      setActiveAgentId(null)
    }
  }

  function copyToClipboard(text: string) {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }

  function handleCopyPost() {
    const textToCopy = editedPost || generatedContent?.orchestratorData?.final_post || ''
    copyToClipboard(textToCopy)
  }

  function downloadImage(url: string, filename: string) {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
  }

  // Render Dashboard
  function renderDashboard() {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">LinkedIn Genius</h1>
            <p className="text-muted-foreground mt-1">AI-powered content engine for viral LinkedIn posts</p>
          </div>
          <Button onClick={() => setScreen('input')} className="gap-2">
            <FiEdit3 /> Create New Post
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts Generated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contentHistory.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Quality Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {contentHistory.length > 0
                  ? (contentHistory.reduce((acc, item) => acc + (item.judgeData?.overall_average ?? 0), 0) / contentHistory.filter(item => item.judgeData).length || 0).toFixed(1)
                  : '0.0'}
                <span className="text-sm text-muted-foreground ml-1">/ 10</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Publication Ready</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {contentHistory.filter(item => item.judgeData?.publication_ready).length}
                <span className="text-sm text-muted-foreground ml-1">posts</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schedule Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FiCalendar className="text-primary" />
                  Automated Content Schedule
                </CardTitle>
                <CardDescription className="mt-1">
                  Daily content generation at 9:00 AM EST
                </CardDescription>
              </div>
              <Badge variant={scheduleStatus?.is_active ? 'default' : 'secondary'}>
                {scheduleStatus?.is_active ? 'Active' : 'Paused'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Schedule</div>
                <div className="font-medium">{cronToHuman(SCHEDULE_CRON)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Timezone</div>
                <div className="font-medium">{SCHEDULE_TIMEZONE}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Next Run</div>
                <div className="font-medium">
                  {scheduleStatus?.next_run ? new Date(scheduleStatus.next_run).toLocaleString() : 'Not scheduled'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={scheduleStatus?.is_active ?? false}
                    onCheckedChange={toggleSchedule}
                    disabled={isLoadingSchedule}
                  />
                  <span className="text-sm">{scheduleStatus?.is_active ? 'Active' : 'Paused'}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setScreen('schedule')} className="gap-2">
                <FiSettings /> Manage Schedule
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Content</CardTitle>
            <CardDescription>Your generated LinkedIn posts</CardDescription>
          </CardHeader>
          <CardContent>
            {contentHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FiFileText className="mx-auto text-4xl mb-3 opacity-50" />
                <p>No content generated yet</p>
                <p className="text-sm mt-1">Create your first post to get started</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {contentHistory.map((item, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-clamp-3 mb-2">
                              {item.orchestratorData?.final_post ?? item.orchestratorData?.content_package?.post_text ?? 'No content'}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {Array.isArray(item.orchestratorData?.content_package?.hashtags) &&
                                item.orchestratorData.content_package.hashtags.slice(0, 3).map((tag, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {item.judgeData?.overall_average !== undefined && (
                              <Badge variant={item.judgeData.overall_average >= 8 ? 'default' : 'secondary'}>
                                Score: {item.judgeData.overall_average.toFixed(1)}/10
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render Input Screen
  function renderInput() {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setScreen('dashboard')} className="gap-2">
            <FiArrowLeft /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Content</h1>
            <p className="text-muted-foreground text-sm">Enter your topic and preferences</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Content Parameters</CardTitle>
            <CardDescription>Provide details for AI-powered content generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic / Idea / URL / Article *</Label>
              <Textarea
                id="topic"
                placeholder="Enter your content topic, paste a LinkedIn URL, share an article link, or describe your idea..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Input
                  id="tone"
                  placeholder="e.g., Professional, Casual, Inspirational"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audience">Target Audience</Label>
                <Input
                  id="audience"
                  placeholder="e.g., Marketing professionals, CTOs"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="length">Post Length</Label>
                <Input
                  id="length"
                  placeholder="e.g., Short, Medium, Long"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta">CTA Preference</Label>
                <Input
                  id="cta"
                  placeholder="e.g., Question, Link, None"
                  value={ctaPreference}
                  onChange={(e) => setCtaPreference(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
                <FiAlertCircle />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="pt-4">
              <Button
                onClick={handleGenerateContent}
                disabled={isGenerating || !topic.trim()}
                className="w-full gap-2"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <FiLoader className="animate-spin" />
                    Generating Content...
                  </>
                ) : (
                  <>
                    <FiZap />
                    Generate Content
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress Indicator */}
        {isGenerating && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generation Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ProgressStep
                  label="Deep Research Agent analyzing topic..."
                  isActive={generationStep === 1}
                  isComplete={generationStep > 1}
                />
                <ProgressStep
                  label="LinkedIn Writer Agent drafting post..."
                  isActive={generationStep === 2}
                  isComplete={generationStep > 2}
                />
                <ProgressStep
                  label="Fact Validation Agent checking accuracy..."
                  isActive={generationStep === 3}
                  isComplete={generationStep > 3}
                />
                <ProgressStep
                  label="Humanization Agent refining content..."
                  isActive={generationStep === 4}
                  isComplete={generationStep > 4}
                />
                <ProgressStep
                  label="Content package ready!"
                  isActive={generationStep === 5}
                  isComplete={generationStep > 5}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Render Output Screen
  function renderOutput() {
    if (!generatedContent) return null

    const orchestratorData = generatedContent.orchestratorData
    const visualData = generatedContent.visualData
    const judgeData = generatedContent.judgeData
    const visualImages = generatedContent.visualImages

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setScreen('dashboard')} className="gap-2">
              <FiArrowLeft /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Generated Content</h1>
              <p className="text-muted-foreground text-sm">Review, edit, and publish your post</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setScreen('input')} className="gap-2">
              <FiRefreshCw /> Regenerate
            </Button>
            <Button onClick={handleCopyPost} className="gap-2">
              <FiCopy /> Copy to Clipboard
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
            <FiAlertCircle />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Final Post */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FiEdit3 className="text-primary" />
                    Your LinkedIn Post
                  </CardTitle>
                  {orchestratorData?.validation_status && (
                    <Badge variant="secondary">{orchestratorData.validation_status}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={editedPost}
                  onChange={(e) => setEditedPost(e.target.value)}
                  rows={12}
                  className="resize-none font-sans"
                />

                <div className="flex flex-wrap gap-2">
                  {Array.isArray(orchestratorData?.content_package?.hashtags) &&
                    orchestratorData.content_package.hashtags.map((tag, i) => (
                      <Badge key={i} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{editedPost.length} characters</span>
                  {Array.isArray(orchestratorData?.content_package?.engagement_elements) &&
                    orchestratorData.content_package.engagement_elements.length > 0 && (
                      <span>Engagement elements: {orchestratorData.content_package.engagement_elements.join(', ')}</span>
                    )}
                </div>
              </CardContent>
            </Card>

            {/* Visual Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FiImage className="text-primary" />
                  Visual Assets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {visualImages.length > 0 ? (
                  <div className="space-y-4">
                    {visualImages.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Generated visual ${index + 1}`}
                          className="w-full rounded-lg border border-border"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-2 right-2 gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => downloadImage(url, `linkedin-visual-${index + 1}.png`)}
                        >
                          <FiDownload /> Download
                        </Button>
                      </div>
                    ))}

                    {visualData && (
                      <Tabs defaultValue="concept" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="concept">Concept</TabsTrigger>
                          <TabsTrigger value="carousel">Carousel</TabsTrigger>
                          <TabsTrigger value="style">Style</TabsTrigger>
                        </TabsList>

                        <TabsContent value="concept" className="space-y-3">
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Single Image Concept</h4>
                            <p className="text-sm text-muted-foreground">{visualData.single_image_concept ?? 'N/A'}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Infographic Concept</h4>
                            <p className="text-sm text-muted-foreground">{visualData.infographic_concept ?? 'N/A'}</p>
                          </div>
                        </TabsContent>

                        <TabsContent value="carousel" className="space-y-2">
                          {Array.isArray(visualData.carousel_concepts) && visualData.carousel_concepts.length > 0 ? (
                            visualData.carousel_concepts.map((slide, i) => (
                              <Card key={i}>
                                <CardContent className="pt-4">
                                  <div className="flex items-start gap-3">
                                    <Badge variant="outline">Slide {slide.slide_number}</Badge>
                                    <div className="flex-1 space-y-1">
                                      <p className="text-sm font-medium">{slide.slide_content}</p>
                                      <p className="text-xs text-muted-foreground">{slide.visual_description}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No carousel concepts available</p>
                          )}
                        </TabsContent>

                        <TabsContent value="style" className="space-y-3">
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Visual Style</h4>
                            <p className="text-sm text-muted-foreground">{visualData.visual_style ?? 'N/A'}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Color Palette</h4>
                            <div className="flex flex-wrap gap-2">
                              {Array.isArray(visualData.color_palette) &&
                                visualData.color_palette.map((color, i) => (
                                  <Badge key={i} variant="secondary">{color}</Badge>
                                ))}
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FiImage className="mx-auto text-4xl mb-3 opacity-50 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">No visuals generated yet</p>
                    <Button onClick={handleGenerateVisual} disabled={isGeneratingVisual} className="gap-2">
                      {isGeneratingVisual ? (
                        <>
                          <FiLoader className="animate-spin" />
                          Generating Visual...
                        </>
                      ) : (
                        <>
                          <FiImage />
                          Generate Visual
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Research Insights */}
            {orchestratorData?.research_insights && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FiSearch className="text-primary" />
                    Research Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderMarkdown(orchestratorData.research_insights)}

                  {Array.isArray(orchestratorData?.content_package?.source_references) &&
                    orchestratorData.content_package.source_references.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <h4 className="font-semibold text-sm mb-2">Sources</h4>
                        <ul className="space-y-1">
                          {orchestratorData.content_package.source_references.map((source, i) => (
                            <li key={i} className="text-xs text-muted-foreground">• {source}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Quality Evaluation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FiBarChart2 className="text-primary" />
                  Quality Evaluation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {judgeData ? (
                  <>
                    <div className="text-center py-4">
                      <div className="text-4xl font-bold mb-2">
                        {judgeData.overall_average?.toFixed(1) ?? '0.0'}
                        <span className="text-xl text-muted-foreground">/10</span>
                      </div>
                      <Badge variant={judgeData.publication_ready ? 'default' : 'secondary'} className="gap-1">
                        {judgeData.publication_ready ? (
                          <>
                            <FiCheckCircle /> Publication Ready
                          </>
                        ) : (
                          <>
                            <FiAlertCircle /> Needs Improvement
                          </>
                        )}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <ScoreBar label="Clarity" score={judgeData.clarity_score ?? 0} />
                      <ScoreBar label="Originality" score={judgeData.originality_score ?? 0} />
                      <ScoreBar label="Authority" score={judgeData.authority_score ?? 0} />
                      <ScoreBar label="Authenticity" score={judgeData.authenticity_score ?? 0} />
                      <ScoreBar label="Engagement" score={judgeData.engagement_potential_score ?? 0} />
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Factual Integrity</span>
                        <Badge variant={judgeData.factual_integrity === 'Pass' ? 'default' : 'destructive'}>
                          {judgeData.factual_integrity ?? 'N/A'}
                        </Badge>
                      </div>
                    </div>

                    {Array.isArray(judgeData.strengths) && judgeData.strengths.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-green-600">Strengths</h4>
                        <ul className="space-y-1">
                          {judgeData.strengths.map((strength, i) => (
                            <li key={i} className="text-xs text-muted-foreground">✓ {strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {Array.isArray(judgeData.improvement_notes) && judgeData.improvement_notes.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-orange-600">Improvement Notes</h4>
                        <ul className="space-y-1">
                          {judgeData.improvement_notes.map((note, i) => (
                            <li key={i} className="text-xs text-muted-foreground">→ {note}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {judgeData.judge_recommendation && (
                      <div className="pt-2 border-t border-border">
                        <h4 className="font-semibold text-sm mb-2">Recommendation</h4>
                        <p className="text-xs text-muted-foreground">{judgeData.judge_recommendation}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <FiBarChart2 className="mx-auto text-4xl mb-3 opacity-50 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">Run evaluation to get quality scores</p>
                    <Button onClick={handleRunEvaluation} disabled={isEvaluating} variant="outline" className="gap-2">
                      {isEvaluating ? (
                        <>
                          <FiLoader className="animate-spin" />
                          Evaluating...
                        </>
                      ) : (
                        <>
                          <FiTarget />
                          Run Evaluation
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workflow Summary */}
            {orchestratorData?.workflow_summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Workflow Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{orchestratorData.workflow_summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Humanization Improvements */}
            {orchestratorData?.humanization_improvements && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Humanization</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{orchestratorData.humanization_improvements}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Render Schedule Management Screen
  function renderSchedule() {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setScreen('dashboard')} className="gap-2">
            <FiArrowLeft /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Schedule Management</h1>
            <p className="text-muted-foreground text-sm">Manage automated content generation</p>
          </div>
        </div>

        {/* Schedule Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Schedule Configuration</CardTitle>
                <CardDescription>Automated daily content generation</CardDescription>
              </div>
              <Badge variant={scheduleStatus?.is_active ? 'default' : 'secondary'}>
                {scheduleStatus?.is_active ? 'Active' : 'Paused'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Schedule</Label>
                <div className="font-medium">{cronToHuman(SCHEDULE_CRON)}</div>
                <div className="text-xs text-muted-foreground">Cron: {SCHEDULE_CRON}</div>
              </div>

              <div className="space-y-2">
                <Label>Timezone</Label>
                <div className="font-medium">{SCHEDULE_TIMEZONE}</div>
              </div>

              <div className="space-y-2">
                <Label>Next Run</Label>
                <div className="font-medium">
                  {scheduleStatus?.next_run
                    ? new Date(scheduleStatus.next_run).toLocaleString()
                    : 'Not scheduled'}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status Control</Label>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={scheduleStatus?.is_active ?? false}
                    onCheckedChange={toggleSchedule}
                    disabled={isLoadingSchedule}
                  />
                  <span className="text-sm font-medium">
                    {scheduleStatus?.is_active ? 'Active' : 'Paused'}
                  </span>
                  {isLoadingSchedule && <FiLoader className="animate-spin text-muted-foreground" />}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h4 className="font-semibold text-sm mb-2">Schedule Message</h4>
              <p className="text-sm text-muted-foreground">
                Generate trending LinkedIn content based on saved topics
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Run History */}
        <Card>
          <CardHeader>
            <CardTitle>Run History</CardTitle>
            <CardDescription>Past scheduled executions</CardDescription>
          </CardHeader>
          <CardContent>
            {runHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FiClock className="mx-auto text-4xl mb-3 opacity-50" />
                <p>No run history available</p>
                <p className="text-sm mt-1">Scheduled runs will appear here</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {runHistory.map((run, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={run.status === 'completed' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>
                                {run.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{run.run_id}</span>
                            </div>
                            <div className="text-sm">
                              Started: {new Date(run.started_at).toLocaleString()}
                            </div>
                            {run.completed_at && (
                              <div className="text-xs text-muted-foreground">
                                Completed: {new Date(run.completed_at).toLocaleString()}
                              </div>
                            )}
                            {run.error_message && (
                              <div className="text-xs text-destructive mt-1">
                                Error: {run.error_message}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Top Bar */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiTrendingUp className="text-primary text-xl" />
            <span className="font-bold text-lg">LinkedIn Genius</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="sample-toggle" className="text-sm">Sample Data</Label>
              <Switch
                id="sample-toggle"
                checked={useSampleData}
                onCheckedChange={setUseSampleData}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {screen === 'dashboard' && renderDashboard()}
        {screen === 'input' && renderInput()}
        {screen === 'output' && renderOutput()}
        {screen === 'schedule' && renderSchedule()}
      </div>

      {/* Agent Status Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">Powered by:</span>
              <AgentStatus
                name="Content Orchestrator"
                isActive={activeAgentId === CONTENT_ORCHESTRATOR_ID}
              />
              <AgentStatus
                name="Visual Intelligence"
                isActive={activeAgentId === VISUAL_INTELLIGENCE_ID}
              />
              <AgentStatus
                name="LLM Judge"
                isActive={activeAgentId === LLM_JUDGE_ID}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
