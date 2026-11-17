"""Clips for /learnings/seq2seq."""

from manimlib import *

from style import FADED, SAGE, Clip, formula, split_formula, split_words, words

# The story's decoder: the chance it gave each right word, and the words
WORDS = ["the", "black", "cat", "sleeps", R"\textless/s\textgreater"]
CHANCES = ["0.72", "0.55", "0.86", "0.78", "0.93"]
PRODUCT = "0.247"  # 0.72 x 0.55 x 0.86 x 0.78 x 0.93
LOSS = "1.40"  # -ln 0.247


class SentenceChance(Clip):
    """The chance of a translation, built up: the product over steps of the
    chance of each word given the source and the words before it. Then the
    story's five chances dropped in, multiplied, and the training loss as
    minus the log, with each step fed the right words: teacher forcing."""

    def construct(self):
        title = words("the chance of a whole translation", font_size=38, color=FADED).to_edge(UP, buff=0.6)
        rule, parts = split_formula(
            R"P(\mathbf{e} \mid \mathbf{f})",
            "=",
            R"\prod_{t}",
            R"P(e_t",
            R"\mskip\thickmuskip\mid\mskip\thickmuskip",
            R"e_{<t},",
            R"\,\mathbf{f})",
            font_size=60,
        )
        rule.next_to(title, DOWN, buff=0.55)
        self.play(FadeIn(title, shift=0.2 * DOWN), Write(parts[0]), run_time=1.4)
        self.play(FadeIn(parts[1]), FadeIn(parts[2]), FadeIn(parts[3]), FadeIn(parts[4]), run_time=1.0)

        # The two things each word leans on
        before = words("the words before it", font_size=34, color=SAGE)
        source = words("the source", font_size=34, color=SAGE)
        before.next_to(parts[5], DOWN, buff=0.45)
        source.next_to(parts[6], UP, buff=0.35)
        self.play(FadeIn(before, shift=0.2 * UP), Write(parts[5]), run_time=1.0)
        self.play(FadeIn(source, shift=0.2 * DOWN), Write(parts[6]), run_time=1.0)
        self.wait(1.2)

        # The story: five words, five chances
        story = words(R"le chat noir dort $\rightarrow$ the black cat sleeps", font_size=36, color=FADED)
        story.next_to(rule, DOWN, buff=0.6)
        self.play(FadeOut(before), FadeOut(source), FadeIn(story), run_time=0.8)

        # One line of words, so they share a baseline; each sits over its factor
        _, labels = split_words(*WORDS, font_size=34, color=FADED)
        pieces = []
        for i, c in enumerate(CHANCES):
            if i:
                pieces.append(R"\times")
            pieces.append(c)
        pieces += ["=", PRODUCT]
        numbers, nparts = split_formula(*pieces, font_size=56)
        numbers.next_to(story, DOWN, buff=0.9)
        factors = [nparts[2 * i] for i in range(len(CHANCES))]
        labels.next_to(numbers, UP, buff=0.25)
        for label, factor in zip(labels, factors):
            label.set_x(factor.get_x())
        for i, (label, factor) in enumerate(zip(labels, factors)):
            anims = [FadeIn(label, shift=0.15 * DOWN), FadeIn(factor, shift=0.15 * DOWN)]
            if i:
                anims.append(FadeIn(nparts[2 * i - 1]))
            self.play(*anims, run_time=0.6)
        result = VGroup(nparts[-2], nparts[-1])
        nparts[-1].set_fill(SAGE)
        self.play(FadeIn(result, shift=0.2 * LEFT), run_time=0.9)
        self.wait(1.2)

        # The training loss, with the right words fed in
        loss = formula(
            R"-\log P(\mathbf{e} \mid \mathbf{f}) = -\log " + PRODUCT + " = " + LOSS,
            font_size=54,
        )
        loss.next_to(numbers, DOWN, buff=0.7)
        forced = words("each step fed the right words before it: teacher forcing", font_size=34, color=SAGE)
        forced.next_to(loss, DOWN, buff=0.35)
        self.play(Write(loss), run_time=1.4)
        self.play(FadeIn(forced, shift=0.2 * UP))
        everything = VGroup(title, rule, story, labels, numbers, loss, forced)
        if everything.get_height() > FRAME_HEIGHT - 0.6:
            self.play(everything.animate.set_height(FRAME_HEIGHT - 0.6).center(), run_time=0.8)
        self.wait(3)
