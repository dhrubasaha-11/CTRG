from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0007_stage1score_recommendation_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='reviewerprofile',
            name='cv',
            field=models.FileField(
                blank=True,
                help_text='Optional reviewer CV for SRC Chair review',
                null=True,
                upload_to='reviewer_cvs/',
                validators=[django.core.validators.FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx'])],
            ),
        ),
    ]
