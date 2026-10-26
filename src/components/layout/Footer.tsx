import { Link } from 'react-router-dom'
import Container from './Container'
import { Mail } from 'lucide-react'
import { Github, Linkedin } from '../ui/brandIcons'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 py-4 bg-paper/90 dark:bg-[#0f0f0f]/90 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-200/20 transition-colors duration-300">
      <Container>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="font-mono text-sm text-zinc-faded uppercase tracking-widest">
            <Link to="/admin" className="font-serif text-sm normal-case tracking-normal italic hover:text-sage transition-colors duration-300">
              Henry Hsu
            </Link>
            <span className="mx-3">/</span>
            <span>{currentYear}</span>
          </div>

          <div className="flex items-center gap-5">
            <a
              href="https://github.com/yarikama"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-faded hover:text-sage transition-colors duration-300"
              aria-label="GitHub"
            >
              <Github size={18} />
            </a>
            <a
              href="https://linkedin.com/in/yarikama"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-faded hover:text-sage transition-colors duration-300"
              aria-label="LinkedIn"
            >
              <Linkedin size={18} />
            </a>
            <a
              href="mailto:hsuhengjui@gmail.com"
              className="text-zinc-faded hover:text-sage transition-colors duration-300"
              aria-label="Email"
            >
              <Mail size={18} />
            </a>
          </div>
        </div>
      </Container>
    </footer>
  )
}
