"""Clips for /learnings/for-all-queries."""

from manimlib import *

from style import FADED, SAGE, Clip, split_formula, split_words, words


class NoneMissing(Clip):
    """"Every homework" said the other way round, as "no homework not handed
    in"; then each word becomes its symbol, giving for-all as not-exists-not;
    then each negation becomes one NOT EXISTS of SQL."""

    def construct(self):
        said, sp = split_words("Ana handed in", "every", "homework", font_size=54)
        flipped, fp = split_words("there is", "no", "homework Ana did", "not", "hand in", font_size=54)
        rule, rp = split_formula(
            R"\forall h", R"\,P(\mathrm{Ana}, h)", R"\mskip\thickmuskip\equiv\mskip\thickmuskip",
            R"\neg\exists h", R"\,\neg", R"P(\mathrm{Ana}, h)",
            font_size=76,
        )
        # The words and the formula they become, centred together
        VGroup(said, flipped, rule).arrange(DOWN, buff=0.7).move_to(ORIGIN)
        flipped.shift(0.1 * UP)
        for piece in (sp[1], fp[1], fp[3], rp[0], rp[3], rp[4]):
            piece.set_fill(SAGE)

        self.play(Write(said), run_time=1.8)
        self.wait(0.6)
        # "every" turns into a "no" and a "not"
        self.play(
            FadeIn(VGroup(fp[0], fp[2], fp[4])),
            FadeTransform(sp[1].copy(), fp[1]),
            FadeTransform(sp[1].copy(), fp[3]),
            run_time=1.8,
        )
        self.wait(1.0)

        # Each phrase becomes its symbol
        self.play(
            FadeTransform(sp[1].copy(), rp[0]),
            FadeTransform(VGroup(sp[0], sp[2]).copy(), rp[1]),
            FadeIn(rp[2]),
            FadeTransform(fp[1].copy(), rp[3]),
            FadeTransform(fp[3].copy(), rp[4]),
            FadeTransform(VGroup(fp[2], fp[4]).copy(), rp[5]),
            run_time=2.4,
        )
        self.wait(1.2)

        # Where everything ends up: the formula, then the SQL, then the gist
        outer, op = split_words(R"\texttt{NOT EXISTS}", "( a homework $h$ where", font_size=50)
        inner, ip = split_words(R"\texttt{NOT EXISTS}", "( a row: Ana handed in $h$ ) )", font_size=50)
        op[0].set_fill(SAGE)
        ip[0].set_fill(SAGE)
        in_sql = words("in SQL", font_size=38, color=FADED)
        gist = words("for all  $=$  no counterexample", font_size=54, color=SAGE)
        target = rule.copy()
        sql = VGroup(in_sql, outer, inner)
        in_sql.next_to(outer, UP, buff=0.35, aligned_edge=LEFT)
        inner.next_to(outer, DOWN, buff=0.35, aligned_edge=LEFT).shift(0.9 * RIGHT)
        layout = VGroup(target, sql, gist).arrange(DOWN, buff=0.85).move_to(ORIGIN)
        sql.match_x(target)

        self.play(FadeOut(VGroup(said, flipped)), rule.animate.move_to(target), run_time=0.9)

        # Each negation becomes a NOT EXISTS
        self.play(FadeIn(in_sql), run_time=0.6)
        self.play(TransformFromCopy(rp[3], op[0]), FadeIn(op[1]), run_time=1.6)
        self.play(TransformFromCopy(rp[4], ip[0]), FadeIn(ip[1]), run_time=1.6)
        self.wait(0.8)
        self.play(FadeIn(gist, shift=0.2 * UP), run_time=1.2)
        self.wait(3)
