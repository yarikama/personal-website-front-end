"""Clips for /learnings/recurrent-networks."""

from manimlib import *

from style import FADED, SAGE, Clip, split_formula, split_words, words

# The Garamond maths has no partial sign: borrow newtx's
PARTIAL = R"\text{\usefont{OML}{ntxmi}{m}{it}\char64}"


def d(top: str, bottom: str) -> str:
    """The derivative of `top` by `bottom`, as a fraction."""
    return Rf"\frac{{{PARTIAL} {top}}}{{{PARTIAL} {bottom}}}"


FIRST = d("L", "h_2")
# Relations set apart in pieces of their own keep their spacing this way
LE = R"\mskip\thickmuskip\le\mskip\thickmuskip"
APPROX = R"\mskip\thickmuskip\approx\mskip\thickmuskip"


class BlameProduct(Clip):
    """Backpropagation through time as the chain rule along the unrolled
    loop: the blame reaching word 2 from the loss at word 20 is eighteen
    factors, each the memory weight times the sigmoid's slope. Then numbers:
    a half eighteen times, and one and a half eighteen times."""

    def construct(self):
        said, sp = split_words(
            "blame at word 2", "=", "blame at word 20", R"$\times$", "one factor per step back",
            font_size=36,
        )
        chain, cp = split_formula(
            FIRST,
            "=",
            d("L", "h_{20}"),
            R"\cdot",
            d("h_{20}", "h_{19}"),
            R"\cdot",
            d("h_{19}", "h_{18}"),
            R"\cdots",
            d("h_{3}", "h_{2}"),
            font_size=60,
            t2c={FIRST: SAGE},
        )
        said.to_edge(UP, buff=0.9)
        chain.next_to(said, DOWN, buff=0.7)

        self.play(Write(said), run_time=2.2)
        self.wait(0.6)
        # Each phrase becomes its symbols
        self.play(
            FadeTransform(sp[0].copy(), cp[0]),
            FadeTransform(sp[1].copy(), cp[1]),
            FadeTransform(sp[2].copy(), cp[2]),
            FadeTransform(sp[3].copy(), cp[3]),
            FadeTransform(sp[4].copy(), cp[4:]),
            run_time=2.2,
        )
        self.play(FadeOut(said), chain.animate.to_edge(UP, buff=0.8), run_time=1)

        # The factors: eighteen, all of one kind
        factors = cp[4:]
        brace = Brace(factors, DOWN, buff=0.15).set_fill(FADED)
        count = words("18 factors, one per step back", font_size=34, color=FADED).next_to(brace, DOWN, buff=0.15)
        self.play(GrowFromCenter(brace), FadeIn(count, shift=0.2 * DOWN))
        self.wait(1)

        each, ep = split_formula(
            d("h_{t}", "h_{t-1}"), "=", "w", R"\times", R"\sigma'", LE, R"\frac{w}{4}",
            font_size=58,
        )
        each.next_to(count, DOWN, buff=0.6)
        why = words(R"memory weight $\times$ the sigmoid's slope, never above $\tfrac14$", font_size=34, color=FADED)
        why.next_to(each, DOWN, buff=0.35)
        self.play(TransformFromCopy(cp[4], ep[0]), FadeIn(ep[1:5]), run_time=1.4)
        self.play(FadeIn(ep[5:]), FadeIn(why, shift=0.2 * UP), run_time=1.2)
        self.wait(1.2)

        # Numbers dropped in
        self.play(FadeOut(why), FadeOut(brace), FadeOut(count), each.animate.next_to(chain, DOWN, buff=0.7), run_time=1)
        small, smp = split_formula(R"w=2", R"\qquad\left(\tfrac12\right)^{18}", APPROX, "0.0000038", font_size=56, t2c={"0.0000038": SAGE})
        big, bp = split_formula(R"w=6", R"\qquad\left(\tfrac32\right)^{18}", APPROX, "1{,}478", font_size=56)
        small.next_to(each, DOWN, buff=0.7)
        big.next_to(small, DOWN, buff=0.45)
        big.align_to(small, LEFT)
        self.play(FadeIn(smp[0]), TransformFromCopy(ep[6], smp[1]), run_time=1.2)
        self.play(FadeIn(smp[2:], shift=0.2 * LEFT))
        vanish = words("vanishing", font_size=36, color=SAGE).next_to(small, RIGHT, buff=0.5)
        self.play(FadeIn(vanish))
        self.wait(0.8)
        self.play(FadeIn(bp[0]), TransformFromCopy(ep[6], bp[1]), run_time=1.2)
        self.play(FadeIn(bp[2:], shift=0.2 * LEFT))
        explode = words("exploding", font_size=36).next_to(big, RIGHT, buff=0.5)
        explode.align_to(vanish, LEFT)
        self.play(FadeIn(explode))
        self.wait(3)
