from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('proposals', '0006_add_is_locked_to_proposal'),
    ]

    operations = [
        migrations.AddField(
            model_name='grantcycle',
            name='score_weights',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Custom score weights per criteria. Leave empty for defaults.',
            ),
        ),
    ]
