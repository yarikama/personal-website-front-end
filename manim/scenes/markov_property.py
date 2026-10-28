"""Clips for /learnings/markov-property."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class OnlyNowMatters(Clip):
    """The chance of what happens next, given the whole history. The history
    fades and falls away, leaving the state and action now: p(s', r | s, a),
    the whole of how the world works, one step at a time."""

    def construct(self):
        title = words("the chance of what comes next, given", font_size=40, color=FADED)
        title.to_edge(UP, buff=1.3)
        self.play(FadeIn(title, shift=0.2 * DOWN))

        full, fp = split_formula(
            R"\Pr\{S_{t+1}, R_{t+1}",
            R"\mskip\thickmuskip\mid\mskip\thickmuskip",
            R"S_0, A_0, R_1, S_1, A_1, \ldots, R_t,",
            R"\,S_t, A_t\}",
            font_size=56,
        )
        full.next_to(title, DOWN, buff=0.8)
        self.play(Write(full), run_time=2.5)
        history = words("everything that has happened", font_size=34, color=FADED)
        brace = Brace(fp[2], DOWN, buff=0.15).set_fill(FADED)
        history.next_to(brace, DOWN, buff=0.15)
        now = words("now", font_size=34, color=SAGE)
        now_brace = Brace(fp[3], DOWN, buff=0.15).set_fill(SAGE)
        now.next_to(now_brace, DOWN, buff=0.15)
        self.play(GrowFromCenter(brace), FadeIn(history), GrowFromCenter(now_brace), FadeIn(now))
        self.wait(1.2)

        # The Markov property: the history adds nothing
        self.play(fp[2].animate.set_fill(FADED, opacity=0.35), FadeOut(brace), FadeOut(history), run_time=1)
        cross = Line(fp[2].get_left(), fp[2].get_right(), stroke_color=INK, stroke_width=3)
        self.play(ShowCreation(cross))
        self.wait(0.6)

        short, sp = split_formula(
            R"\Pr\{S_{t+1}, R_{t+1}",
            R"\mskip\thickmuskip\mid\mskip\thickmuskip",
            R"S_t, A_t\}",
            font_size=56,
        )
        short.move_to(full)
        self.play(
            FadeOut(VGroup(fp[2], cross), shift=0.4 * DOWN),
            FadeOut(VGroup(now_brace, now)),
            ReplacementTransform(fp[0], sp[0]),
            ReplacementTransform(fp[1], sp[1]),
            ReplacementTransform(fp[3], sp[2]),
            run_time=1.6,
        )
        markov = words("the Markov property: only now matters", font_size=36, color=SAGE)
        markov.next_to(short, DOWN, buff=0.5)
        self.play(FadeIn(markov, shift=0.2 * UP))
        self.wait(1)

        # Named as the world's dynamics
        dyn = formula(R"p(s', r \mid s, a)", font_size=76, t2c={"p": SAGE})
        dyn.next_to(markov, DOWN, buff=0.8)
        self.play(TransformFromCopy(short, dyn), run_time=1.6)
        note = words("how the world works, one step at a time", font_size=36, color=FADED)
        note.next_to(dyn, DOWN, buff=0.5)
        self.play(FadeIn(note, shift=0.2 * UP))
        self.wait(4)
