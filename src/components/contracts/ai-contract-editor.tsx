"use client"

import { useEditor, EditorContent, Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import { useState, useCallback } from "react"
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Heading1, Heading2, Heading3,
  Undo, Redo, Sparkles, Loader2, Wand2, FileText,
  Copy, Check
} from "lucide-react"

interface AIContractEditorProps {
  content?: string
  onChange?: (html: string) => void
  placeholder?: string
}

const MenuButton = ({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
  title?: string
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-2 rounded-lg transition-colors ${
      active ? "bg-[#E6F0FF]" : "hover:bg-[#F5F5F7]"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    style={{ color: active ? "#0064FA" : "#444444" }}
  >
    {children}
  </button>
)

const Separator = () => (
  <div className="w-px h-6 mx-1" style={{ background: "#EEEEEE" }} />
)

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 p-2 border-b"
      style={{ borderColor: "#EEEEEE" }}
    >
      <MenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Gras"
      >
        <Bold className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italique"
      >
        <Italic className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Souligné"
      >
        <UnderlineIcon className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Barré"
      >
        <Strikethrough className="w-4 h-4" />
      </MenuButton>

      <Separator />

      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Titre 1"
      >
        <Heading1 className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Titre 2"
      >
        <Heading2 className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Titre 3"
      >
        <Heading3 className="w-4 h-4" />
      </MenuButton>

      <Separator />

      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Aligner à gauche"
      >
        <AlignLeft className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Centrer"
      >
        <AlignCenter className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Aligner à droite"
      >
        <AlignRight className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
        title="Justifier"
      >
        <AlignJustify className="w-4 h-4" />
      </MenuButton>

      <Separator />

      <MenuButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Liste à puces"
      >
        <List className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Liste numérotée"
      >
        <ListOrdered className="w-4 h-4" />
      </MenuButton>

      <Separator />

      <MenuButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Annuler"
      >
        <Undo className="w-4 h-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Rétablir"
      >
        <Redo className="w-4 h-4" />
      </MenuButton>
    </div>
  )
}

const contractTemplates = [
  { id: "freelance", label: "Contrat freelance", description: "Prestation de services" },
  { id: "nda", label: "NDA", description: "Accord de confidentialité" },
  { id: "rental", label: "Bail commercial", description: "Location de locaux" },
  { id: "partnership", label: "Partenariat", description: "Accord de collaboration" },
  { id: "sale", label: "Contrat de vente", description: "Vente de biens/services" },
]

export function AIContractEditor({ content = "", onChange, placeholder }: AIContractEditorProps) {
  const [generating, setGenerating] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [showAIPanel, setShowAIPanel] = useState(!content)
  const [copied, setCopied] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: placeholder || "Commencez à rédiger votre contrat...",
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[500px] p-6",
      },
    },
  })

  const generateContract = useCallback(async (templateId?: string) => {
    if (!prompt.trim() && !templateId) return

    setGenerating(true)
    try {
      const res = await fetch("/api/ai/generate-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          templateId,
        }),
      })

      if (!res.ok) throw new Error("Erreur lors de la génération")

      const data = await res.json()
      if (data.content && editor) {
        editor.commands.setContent(data.content)
        setShowAIPanel(false)
      }
    } catch (error) {
      console.error("Error generating contract:", error)
      alert("Erreur lors de la génération du contrat")
    } finally {
      setGenerating(false)
    }
  }, [prompt, editor])

  const improveSelection = useCallback(async () => {
    if (!editor) return

    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to)

    if (!selectedText.trim()) {
      alert("Sélectionnez du texte à améliorer")
      return
    }

    setGenerating(true)
    try {
      const res = await fetch("/api/ai/improve-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText }),
      })

      if (!res.ok) throw new Error("Erreur lors de l'amélioration")

      const data = await res.json()
      if (data.improved) {
        editor.chain().focus().deleteSelection().insertContent(data.improved).run()
      }
    } catch (error) {
      console.error("Error improving text:", error)
      alert("Erreur lors de l'amélioration du texte")
    } finally {
      setGenerating(false)
    }
  }, [editor])

  const copyHTML = useCallback(() => {
    if (!editor) return
    navigator.clipboard.writeText(editor.getHTML())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [editor])

  return (
    <div className="flex gap-6">
      {/* AI Panel */}
      {showAIPanel && (
        <div
          className="w-80 flex-shrink-0 rounded-2xl p-6 space-y-6"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #0064FA 100%)" }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: "#111111" }}>
                Assistant IA
              </h3>
              <p className="text-xs" style={{ color: "#666666" }}>
                Génération de contrats
              </p>
            </div>
          </div>

          {/* Templates */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: "#666666" }}>
              Modèles rapides
            </p>
            <div className="grid grid-cols-2 gap-2">
              {contractTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => generateContract(template.id)}
                  disabled={generating}
                  className="p-3 rounded-xl text-left transition-all hover:shadow-md disabled:opacity-50"
                  style={{ background: "#F5F5F7" }}
                >
                  <p className="text-xs font-medium" style={{ color: "#111111" }}>
                    {template.label}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#999999" }}>
                    {template.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: "#666666" }}>
              Ou décrivez votre contrat
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Un contrat de prestation de services pour du développement web, avec une durée de 3 mois, facturation mensuelle..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0064FA]/20"
              style={{ background: "#F5F5F7", border: "1px solid #EEEEEE" }}
            />
            <button
              onClick={() => generateContract()}
              disabled={generating || !prompt.trim()}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ background: "#0064FA", color: "#FFFFFF" }}
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Générer le contrat
            </button>
          </div>

          <button
            onClick={() => setShowAIPanel(false)}
            className="w-full text-center text-sm py-2"
            style={{ color: "#666666" }}
          >
            Rédiger manuellement
          </button>
        </div>
      )}

      {/* Editor */}
      <div
        className="flex-1 rounded-2xl overflow-hidden"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "#EEEEEE" }}>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: "#0064FA" }} />
            <span className="text-sm font-medium" style={{ color: "#111111" }}>
              Éditeur de contrat
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!showAIPanel && (
              <button
                onClick={() => setShowAIPanel(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-[#F5F5F7]"
                style={{ color: "#8B5CF6" }}
              >
                <Sparkles className="w-4 h-4" />
                IA
              </button>
            )}
            <button
              onClick={improveSelection}
              disabled={generating}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-[#F5F5F7] disabled:opacity-50"
              style={{ color: "#666666" }}
              title="Améliorer la sélection avec l'IA"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Améliorer
            </button>
            <button
              onClick={copyHTML}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-[#F5F5F7]"
              style={{ color: "#666666" }}
              title="Copier le HTML"
            >
              {copied ? (
                <Check className="w-4 h-4" style={{ color: "#28B95F" }} />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <MenuBar editor={editor} />

        <div className="relative">
          {generating && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <div className="flex items-center gap-3 px-6 py-3 rounded-xl shadow-lg" style={{ background: "#FFFFFF" }}>
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#0064FA" }} />
                <span className="text-sm font-medium" style={{ color: "#111111" }}>
                  L'IA génère votre contrat...
                </span>
              </div>
            </div>
          )}
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
