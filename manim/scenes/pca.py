"""Clips for /learnings/pca."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, words


class VarianceAlong(Clip):
    """The spread of the shadows along a unit direction u is u-transpose
    Sigma u. With the loaf's Sigma, [[5, 4], [4, 5]], and u at angle theta,
    it is 5 + 4 sin 2 theta: largest at 45 degrees, where Sigma u = 9u, the
    top eigenvector. What it misses is 5 - 4 sin 2 theta, so kept plus
    missed is always 10, and at the best direction the miss is the other
    eigenvalue, 1."""

    def construct(self):
        title = words("the spread of the shadows along a direction $u$", font_size=38, color=FADED).to_edge(UP, buff=0.5)
        mean_sq = formula(R"\frac{1}{n}\sum_i \big(x_i^{\top} u\big)^2", font_size=64)
        mean_sq.next_to(title, DOWN, buff=0.7)
        self.play(FadeIn(title, shift=0.2 * DOWN), Write(mean_sq), run_time=2)
        self.wait(0.8)

        # The same, read off the covariance
        quad = formula(R"\frac{1}{n}\sum_i \big(x_i^{\top} u\big)^2 = u^{\top}\Sigma\, u", font_size=64, t2c={R"\Sigma": SAGE})
        quad.move_to(mean_sq)
        self.play(TransformMatchingTex(mean_sq, quad), run_time=1.4)
        sigma = formula(
            R"\Sigma = \begin{bmatrix} 5 & 4 \\ 4 & 5 \end{bmatrix},\quad u = (\cos\theta,\ \sin\theta)",
            font_size=54,
            t2c={R"\Sigma": SAGE},
        )
        sigma.next_to(quad, DOWN, buff=0.6)
        self.play(FadeIn(sigma, shift=0.2 * UP), run_time=1.2)
        self.wait(1.0)

        # Multiply it out
        long = formula(R"u^{\top}\Sigma\, u = 5\cos^2\theta + 8\cos\theta\sin\theta + 5\sin^2\theta", font_size=54)
        long.next_to(sigma, DOWN, buff=0.6)
        self.play(Write(long), run_time=1.8)
        self.wait(0.6)
        short = formula(R"u^{\top}\Sigma\, u = 5 + 4\sin 2\theta", font_size=60, t2c={R"4\sin 2\theta": SAGE})
        short.move_to(long)
        self.play(FadeTransform(long, short), run_time=1.4)
        self.wait(1.0)

        # The top of it, and what it is
        self.play(FadeOut(VGroup(title, quad, sigma)), short.animate.to_edge(UP, buff=0.7), run_time=1.0)
        best = formula(R"\theta = 45^{\circ},\quad \Sigma u = 9\,u", font_size=60, color=SAGE)
        best.next_to(short, DOWN, buff=0.6)
        best_says = words("largest when $\\sin 2\\theta = 1$: the top eigenvector, eigenvalue $9$", font_size=36, color=FADED)
        best_says.next_to(best, DOWN, buff=0.3)
        self.play(Write(best), run_time=1.4)
        self.play(FadeIn(best_says, shift=0.2 * UP))
        self.wait(1.4)

        # Kept and missed always add to the same
        split = formula(R"\underbrace{(5 + 4\sin 2\theta)}_{\text{kept}} + \underbrace{(5 - 4\sin 2\theta)}_{\text{missed}} = 10", font_size=54)
        split.next_to(best_says, DOWN, buff=0.6)
        self.play(Write(split), run_time=2)
        self.wait(1.0)
        at_best = formula(R"\text{at } 45^{\circ},\quad 9 + 1 = 10", font_size=56)
        at_best.next_to(split, DOWN, buff=0.5)
        at_says = words("the miss is the other eigenvalue, $1$", font_size=36, color=SAGE)
        at_says.next_to(at_best, DOWN, buff=0.3)
        self.play(FadeIn(at_best, shift=0.2 * UP), run_time=1.0)
        self.play(FadeIn(at_says))
        self.play(VGroup(short, best, best_says, split, at_best, at_says).animate.center(), run_time=0.8)
        self.wait(3)
